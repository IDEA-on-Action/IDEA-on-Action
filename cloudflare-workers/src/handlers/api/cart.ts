/**
 * Cart API 핸들러
 * 장바구니 CRUD 관리
 */

import { Hono } from 'hono';
import { AppType } from '../../types';

const cart = new Hono<AppType>();

// 장바구니 항목 타입
interface CartItem {
  id: string;
  user_id: string;
  service_id: string;
  package_id: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

// GET /api/v1/cart - 장바구니 조회
cart.get('/', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const result = await db
      .prepare(`
        SELECT
          c.*,
          s.name as service_name,
          s.name_ko as service_name_ko,
          s.slug as service_slug,
          s.price as service_price,
          s.image_url as service_image,
          s.description as service_description
        FROM carts c
        LEFT JOIN services s ON c.service_id = s.id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
      `)
      .bind(user.id)
      .all();

    // 총 금액 계산
    let totalAmount = 0;
    const items = (result.results || []).map((item: Record<string, unknown>) => {
      const itemTotal = (item.service_price as number || 0) * (item.quantity as number || 1);
      totalAmount += itemTotal;
      return {
        ...item,
        total_price: itemTotal,
      };
    });

    return c.json({
      data: {
        items,
        total_amount: totalAmount,
        item_count: items.length,
      },
    });
  } catch (error) {
    console.error('[Cart API] 조회 오류:', error);
    return c.json({ error: '장바구니를 조회할 수 없습니다' }, 500);
  }
});

// POST /api/v1/cart - 장바구니에 항목 추가
cart.post('/', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const body = await c.req.json();
    const { service_id, package_id, quantity = 1 } = body;

    if (!service_id) {
      return c.json({ error: '서비스 ID가 필요합니다' }, 400);
    }

    // 서비스 존재 확인
    const service = await db
      .prepare('SELECT * FROM services WHERE id = ? AND status = ?')
      .bind(service_id, 'active')
      .first();

    if (!service) {
      return c.json({ error: '서비스를 찾을 수 없습니다' }, 404);
    }

    // 이미 장바구니에 있는지 확인
    const existing = await db
      .prepare('SELECT * FROM carts WHERE user_id = ? AND service_id = ? AND (package_id = ? OR (package_id IS NULL AND ? IS NULL))')
      .bind(user.id, service_id, package_id || null, package_id || null)
      .first<CartItem>();

    const now = new Date().toISOString();

    if (existing) {
      // 수량 업데이트
      const newQuantity = existing.quantity + quantity;
      await db
        .prepare('UPDATE carts SET quantity = ?, updated_at = ? WHERE id = ?')
        .bind(newQuantity, now, existing.id)
        .run();

      return c.json({
        data: { ...existing, quantity: newQuantity, updated_at: now },
        message: '수량이 업데이트되었습니다',
      });
    }

    // 새 항목 추가
    const id = crypto.randomUUID();
    await db
      .prepare(`
        INSERT INTO carts (id, user_id, service_id, package_id, quantity, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(id, user.id, service_id, package_id || null, quantity, now, now)
      .run();

    const item = await db
      .prepare('SELECT * FROM carts WHERE id = ?')
      .bind(id)
      .first<CartItem>();

    return c.json({ data: item }, 201);
  } catch (error) {
    console.error('[Cart API] 추가 오류:', error);
    return c.json({ error: '장바구니에 추가할 수 없습니다' }, 500);
  }
});

// PATCH /api/v1/cart/:id - 장바구니 항목 수량 업데이트
cart.patch('/:id', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const body = await c.req.json();
    const { quantity } = body;

    if (quantity === undefined || quantity < 1) {
      return c.json({ error: '유효한 수량이 필요합니다' }, 400);
    }

    // 항목 확인
    const item = await db
      .prepare('SELECT * FROM carts WHERE id = ? AND user_id = ?')
      .bind(id, user.id)
      .first<CartItem>();

    if (!item) {
      return c.json({ error: '장바구니 항목을 찾을 수 없습니다' }, 404);
    }

    const now = new Date().toISOString();
    await db
      .prepare('UPDATE carts SET quantity = ?, updated_at = ? WHERE id = ?')
      .bind(quantity, now, id)
      .run();

    return c.json({
      data: { ...item, quantity, updated_at: now },
    });
  } catch (error) {
    console.error('[Cart API] 업데이트 오류:', error);
    return c.json({ error: '장바구니를 업데이트할 수 없습니다' }, 500);
  }
});

// DELETE /api/v1/cart/:id - 장바구니 항목 삭제
cart.delete('/:id', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const item = await db
      .prepare('SELECT * FROM carts WHERE id = ? AND user_id = ?')
      .bind(id, user.id)
      .first();

    if (!item) {
      return c.json({ error: '장바구니 항목을 찾을 수 없습니다' }, 404);
    }

    await db.prepare('DELETE FROM carts WHERE id = ?').bind(id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('[Cart API] 삭제 오류:', error);
    return c.json({ error: '장바구니 항목을 삭제할 수 없습니다' }, 500);
  }
});

// DELETE /api/v1/cart - 장바구니 전체 비우기
cart.delete('/', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    await db.prepare('DELETE FROM carts WHERE user_id = ?').bind(user.id).run();

    return c.json({ success: true, message: '장바구니가 비워졌습니다' });
  } catch (error) {
    console.error('[Cart API] 비우기 오류:', error);
    return c.json({ error: '장바구니를 비울 수 없습니다' }, 500);
  }
});

// POST /api/v1/cart/checkout - 장바구니 → 주문 변환
cart.post('/checkout', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    // 장바구니 조회
    const cartItems = await db
      .prepare(`
        SELECT c.*, s.price as service_price
        FROM carts c
        LEFT JOIN services s ON c.service_id = s.id
        WHERE c.user_id = ? AND s.status = 'active'
      `)
      .bind(user.id)
      .all();

    if (!cartItems.results || cartItems.results.length === 0) {
      return c.json({ error: '장바구니가 비어있습니다' }, 400);
    }

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();

    // 총 금액 계산
    let totalAmount = 0;
    const orderItems = cartItems.results.map((item: Record<string, unknown>) => {
      const quantity = item.quantity as number || 1;
      const unitPrice = item.service_price as number || 0;
      const itemTotal = unitPrice * quantity;
      totalAmount += itemTotal;

      return {
        id: crypto.randomUUID(),
        order_id: orderId,
        service_id: item.service_id,
        package_id: item.package_id,
        quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
        created_at: now,
      };
    });

    // 주문 생성
    await db
      .prepare(`
        INSERT INTO orders (id, user_id, status, total_amount, currency, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(orderId, user.id, 'pending', totalAmount, 'KRW', now, now)
      .run();

    // 주문 항목 생성
    for (const item of orderItems) {
      await db
        .prepare(`
          INSERT INTO order_items (id, order_id, service_id, package_id, quantity, unit_price, total_price, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          item.id,
          item.order_id,
          item.service_id,
          item.package_id,
          item.quantity,
          item.unit_price,
          item.total_price,
          item.created_at
        )
        .run();
    }

    // 장바구니 비우기
    await db.prepare('DELETE FROM carts WHERE user_id = ?').bind(user.id).run();

    const order = await db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .bind(orderId)
      .first();

    return c.json({
      data: {
        ...order,
        items: orderItems,
      },
    }, 201);
  } catch (error) {
    console.error('[Cart API] 체크아웃 오류:', error);
    return c.json({ error: '주문을 생성할 수 없습니다' }, 500);
  }
});

export default cart;
