/**
 * Orders API 핸들러
 * 주문 CRUD 및 주문 항목 관리
 */

import { Hono } from 'hono';
import { AppType } from '../../types';

const orders = new Hono<AppType>();

// 주문 타입 정의
interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  total_amount: number;
  currency: string;
  payment_method: string | null;
  payment_key: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  service_id: string;
  package_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

// GET /api/v1/orders - 주문 목록 조회
orders.get('/', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  const { status, limit, offset } = c.req.query();

  try {
    let sql = 'SELECT * FROM orders WHERE user_id = ?';
    const params: (string | number)[] = [user.id];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const limitNum = parseInt(limit as string) || 20;
    const offsetNum = parseInt(offset as string) || 0;
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offsetNum);

    const result = await db.prepare(sql).bind(...params).all<Order>();

    // 각 주문의 항목 조회
    const ordersWithItems = await Promise.all(
      (result.results || []).map(async (order) => {
        const items = await db
          .prepare(`
            SELECT oi.*, s.name as service_name, s.slug as service_slug
            FROM order_items oi
            LEFT JOIN services s ON oi.service_id = s.id
            WHERE oi.order_id = ?
          `)
          .bind(order.id)
          .all();
        return { ...order, items: items.results || [] };
      })
    );

    return c.json({
      data: ordersWithItems,
      meta: {
        total: result.results?.length || 0,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    console.error('[Orders API] 목록 조회 오류:', error);
    return c.json({ error: '주문 목록을 조회할 수 없습니다' }, 500);
  }
});

// GET /api/v1/orders/:id - 주문 상세 조회
orders.get('/:id', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const order = await db
      .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
      .bind(id, user.id)
      .first<Order>();

    if (!order) {
      return c.json({ error: '주문을 찾을 수 없습니다' }, 404);
    }

    // 주문 항목 조회
    const items = await db
      .prepare(`
        SELECT oi.*, s.name as service_name, s.slug as service_slug, s.image_url
        FROM order_items oi
        LEFT JOIN services s ON oi.service_id = s.id
        WHERE oi.order_id = ?
      `)
      .bind(id)
      .all();

    // 결제 정보 조회
    const payment = await db
      .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(id)
      .first();

    return c.json({
      data: {
        ...order,
        items: items.results || [],
        payment,
      },
    });
  } catch (error) {
    console.error('[Orders API] 상세 조회 오류:', error);
    return c.json({ error: '주문을 조회할 수 없습니다' }, 500);
  }
});

// POST /api/v1/orders - 주문 생성
orders.post('/', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const body = await c.req.json();
    const { items, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return c.json({ error: '주문 항목이 필요합니다' }, 400);
    }

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();

    // 총 금액 계산 및 항목 검증
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const service = await db
        .prepare('SELECT * FROM services WHERE id = ? AND status = ?')
        .bind(item.service_id, 'active')
        .first<{ id: string; price: number; name: string }>();

      if (!service) {
        return c.json({ error: `서비스를 찾을 수 없습니다: ${item.service_id}` }, 400);
      }

      const quantity = item.quantity || 1;
      const unitPrice = service.price;
      const itemTotal = unitPrice * quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        id: crypto.randomUUID(),
        order_id: orderId,
        service_id: service.id,
        package_id: item.package_id || null,
        quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
        created_at: now,
      });
    }

    // 주문 생성
    await db
      .prepare(`
        INSERT INTO orders (id, user_id, status, total_amount, currency, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(orderId, user.id, 'pending', totalAmount, 'KRW', notes || null, now, now)
      .run();

    // 주문 항목 생성
    for (const item of validatedItems) {
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

    const order = await db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .bind(orderId)
      .first<Order>();

    return c.json({
      data: {
        ...order,
        items: validatedItems,
      },
    }, 201);
  } catch (error) {
    console.error('[Orders API] 생성 오류:', error);
    return c.json({ error: '주문을 생성할 수 없습니다' }, 500);
  }
});

// PATCH /api/v1/orders/:id - 주문 상태 업데이트
orders.patch('/:id', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const body = await c.req.json();
    const { status, payment_method, payment_key, notes } = body;

    // 주문 확인
    const order = await db
      .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
      .bind(id, user.id)
      .first<Order>();

    if (!order) {
      return c.json({ error: '주문을 찾을 수 없습니다' }, 404);
    }

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (payment_method !== undefined) {
      updates.push('payment_method = ?');
      values.push(payment_method);
    }
    if (payment_key !== undefined) {
      updates.push('payment_key = ?');
      values.push(payment_key);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    values.push(id);

    await db
      .prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updatedOrder = await db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .bind(id)
      .first<Order>();

    return c.json({ data: updatedOrder });
  } catch (error) {
    console.error('[Orders API] 업데이트 오류:', error);
    return c.json({ error: '주문을 업데이트할 수 없습니다' }, 500);
  }
});

// DELETE /api/v1/orders/:id - 주문 취소
orders.delete('/:id', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const { id } = c.req.param();

  if (!user) {
    return c.json({ error: '인증이 필요합니다' }, 401);
  }

  try {
    const order = await db
      .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
      .bind(id, user.id)
      .first<Order>();

    if (!order) {
      return c.json({ error: '주문을 찾을 수 없습니다' }, 404);
    }

    if (order.status !== 'pending') {
      return c.json({ error: '대기 중인 주문만 취소할 수 있습니다' }, 400);
    }

    await db
      .prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
      .bind('cancelled', new Date().toISOString(), id)
      .run();

    return c.json({ success: true });
  } catch (error) {
    console.error('[Orders API] 취소 오류:', error);
    return c.json({ error: '주문을 취소할 수 없습니다' }, 500);
  }
});

export default orders;
