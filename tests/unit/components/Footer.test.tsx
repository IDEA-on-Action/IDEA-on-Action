import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Footer from '@/components/Footer';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Footer Component', () => {
  it('renders without crashing', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('displays the brand logo and name', () => {
    render(<Footer />);
    
    expect(screen.getByAltText('IDEA on Action Logo')).toBeInTheDocument();
    expect(screen.getByText('IDEA on Action')).toBeInTheDocument();
    expect(screen.getByText('생각과행동')).toBeInTheDocument();
  });

  it('displays the brand description', () => {
    render(<Footer />);
    expect(screen.getByText('생각과행동으로 미래를 설계하다')).toBeInTheDocument();
  });

  it('displays social media links', () => {
    render(<Footer />);
    
    expect(screen.getByLabelText('GitHub 프로필 방문하기')).toBeInTheDocument();
    expect(screen.getByLabelText('LinkedIn 프로필 방문하기')).toBeInTheDocument();
    expect(screen.getByLabelText('이메일 보내기: sinclairseo@gmail.com')).toBeInTheDocument();
  });

  it('displays footer sections', () => {
    render(<Footer />);
    
    expect(screen.getByText('솔루션')).toBeInTheDocument();
    expect(screen.getByText('회사')).toBeInTheDocument();
    expect(screen.getByText('리소스')).toBeInTheDocument();
  });

  it('displays footer links', () => {
    render(<Footer />);
    
    // 솔루션 섹션
    expect(screen.getByText('AI 컨설팅')).toBeInTheDocument();
    expect(screen.getByText('워크플로우 자동화')).toBeInTheDocument();
    expect(screen.getByText('데이터 분석')).toBeInTheDocument();
    
    // 회사 섹션
    expect(screen.getByText('회사소개')).toBeInTheDocument();
    expect(screen.getByText('기술')).toBeInTheDocument();
    expect(screen.getByText('문의')).toBeInTheDocument();
    
    // 리소스 섹션
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('웹사이트')).toBeInTheDocument();
    expect(screen.getByText('블로그')).toBeInTheDocument();
  });

  it('displays copyright information', () => {
    render(<Footer />);
    
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(`© ${currentYear} IDEA on Action (생각과행동). All rights reserved.`)).toBeInTheDocument();
    expect(screen.getByText('KEEP AWAKE, LIVE PASSIONATE')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    const customClass = 'custom-footer-class';
    render(<Footer className={customClass} />);
    
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveClass(customClass);
  });

  it('has proper semantic structure', () => {
    render(<Footer />);
    
    // Check for footer element
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    
    // Check for headings
    const headings = screen.getAllByRole('heading', { level: 4 });
    expect(headings).toHaveLength(3); // 솔루션, 회사, 리소스
  });

  it('has proper accessibility attributes', () => {
    render(<Footer />);
    
    // Check for proper ARIA labels
    expect(screen.getByLabelText('소셜 미디어 링크')).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub 프로필 방문하기')).toBeInTheDocument();
    expect(screen.getByLabelText('LinkedIn 프로필 방문하기')).toBeInTheDocument();
    expect(screen.getByLabelText('이메일 보내기: sinclairseo@gmail.com')).toBeInTheDocument();
  });

  it('has proper external link attributes', () => {
    render(<Footer />);
    
    const githubLink = screen.getByLabelText('GitHub 프로필 방문하기');
    expect(githubLink).toHaveAttribute('target', '_blank');
    expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    
    const linkedinLink = screen.getByLabelText('LinkedIn 프로필 방문하기');
    expect(linkedinLink).toHaveAttribute('target', '_blank');
    expect(linkedinLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('has proper internal link attributes', () => {
    render(<Footer />);
    
    const emailLink = screen.getByLabelText('이메일 보내기: sinclairseo@gmail.com');
    expect(emailLink).toHaveAttribute('href', 'mailto:sinclairseo@gmail.com');
    expect(emailLink).not.toHaveAttribute('target');
    expect(emailLink).not.toHaveAttribute('rel');
  });

  it('supports keyboard navigation', () => {
    render(<Footer />);
    
    const socialLinks = screen.getAllByLabelText(/프로필|이메일/);
    socialLinks.forEach(link => {
      expect(link).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });

  it('has proper hover states', () => {
    render(<Footer />);
    
    const socialLinks = screen.getAllByLabelText(/프로필|이메일/);
    socialLinks.forEach(link => {
      expect(link).toHaveClass('hover:border-primary');
    });
    
    const footerLinks = screen.getAllByText(/AI 컨설팅|회사소개|GitHub/);
    footerLinks.forEach(link => {
      expect(link).toHaveClass('hover:text-primary');
    });
  });

  it('renders with proper responsive classes', () => {
    render(<Footer />);
    
    const grid = screen.getByRole('contentinfo').querySelector('.grid');
    expect(grid).toHaveClass('md:grid-cols-4');
  });

  it('has proper logo attributes', () => {
    render(<Footer />);
    
    const logo = screen.getByAltText('IDEA on Action Logo');
    expect(logo).toHaveAttribute('width', '40');
    expect(logo).toHaveAttribute('height', '40');
  });

  it('has proper list structure', () => {
    render(<Footer />);
    
    const lists = screen.getAllByRole('list');
    expect(lists.length).toBeGreaterThan(0);
    
    // Check for social links list
    const socialList = screen.getByLabelText('소셜 미디어 링크');
    expect(socialList).toHaveAttribute('role', 'list');
  });

  it('meets accessibility standards', async () => {
    const { container } = render(<Footer />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has proper focus management', () => {
    render(<Footer />);
    
    const socialLinks = screen.getAllByLabelText(/프로필|이메일/);
    socialLinks.forEach(link => {
      expect(link).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });

  it('displays current year in copyright', () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    const copyrightText = screen.getByText(new RegExp(`© ${currentYear}.*IDEA on Action`));
    expect(copyrightText).toBeInTheDocument();
  });

  it('has proper link structure for external resources', () => {
    render(<Footer />);
    
    const githubLink = screen.getByText('GitHub');
    expect(githubLink.closest('a')).toHaveAttribute('target', '_blank');
    
    const websiteLink = screen.getByText('웹사이트');
    expect(websiteLink.closest('a')).toHaveAttribute('target', '_blank');
  });

  it('has proper link structure for internal navigation', () => {
    render(<Footer />);
    
    const aboutLink = screen.getByText('회사소개');
    expect(aboutLink.closest('a')).toHaveAttribute('href', '#about');
    
    const contactLink = screen.getByText('문의');
    expect(contactLink.closest('a')).toHaveAttribute('href', '#contact');
  });

  it('has proper icon rendering', () => {
    render(<Footer />);
    
    const icons = screen.getAllByLabelText('', { selector: '[aria-hidden="true"]' });
    expect(icons.length).toBeGreaterThan(0);
  });

  it('has proper section headings', () => {
    render(<Footer />);
    
    const headings = screen.getAllByRole('heading', { level: 4 });
    expect(headings).toHaveLength(3);
    
    const headingTexts = headings.map(heading => heading.textContent);
    expect(headingTexts).toContain('솔루션');
    expect(headingTexts).toContain('회사');
    expect(headingTexts).toContain('리소스');
  });
});
