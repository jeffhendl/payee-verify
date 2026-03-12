import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { blogPosts, getBlogPost } from '@/lib/blog-data';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: 'Post Not Found | VeriPay' };
  return {
    title: `${post.title} | VeriPay Blog`,
    description: post.preview,
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E8EAEC]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/veripay-logo.png" alt="VeriPay" width={32} height={32} className="rounded-lg" />
            <div>
              <span className="font-semibold text-[15px] text-[#1D1D1D] leading-none tracking-[-0.01em]">
                VeriPay
              </span>
              <span className="text-[#71717A] text-[11px] block leading-none mt-0.5">by Loop</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/blog"
              className="text-[13px] font-medium text-[#045B3F] hover:text-[#034a33] transition-colors px-3 py-2"
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="text-[13px] font-medium text-[#71717A] hover:text-[#1D1D1D] transition-colors px-3 py-2"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="text-[13px] font-medium text-white bg-[#045B3F] hover:bg-[#034a33] transition-colors px-4 py-2 rounded-lg"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Article */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#71717A] hover:text-[#045B3F] transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog
        </Link>

        <article className="bg-white rounded-2xl border border-[#E8EAEC] p-8 md:p-12 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[13px] text-[#71717A]">{post.date}</span>
            <span className="text-[#E8EAEC]">|</span>
            <span className="text-[13px] text-[#71717A]">{post.readTime}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold text-[#1D1D1D] tracking-[-0.02em] mb-8 leading-tight">
            {post.title}
          </h1>

          <div className="prose-custom">{post.content}</div>
        </article>

        {/* CTA */}
        <div className="mt-12 bg-white rounded-2xl border border-[#E8EAEC] p-8 md:p-12 shadow-sm text-center">
          <h2 className="text-2xl font-semibold text-[#1D1D1D] tracking-[-0.02em] mb-3">
            Protect your business from payment fraud
          </h2>
          <p className="text-[#71717A] text-[15px] leading-relaxed mb-6 max-w-md mx-auto">
            Verify vendors and validate invoice details before you send a payment.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[15px] font-medium text-white bg-[#045B3F] hover:bg-[#034a33] transition-colors px-6 py-3 rounded-xl"
          >
            Try VeriPay
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8EAEC] bg-white mt-12">
        <div className="max-w-3xl mx-auto px-6 py-8 text-center">
          <a
            href="https://bankonloop.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-[#71717A] hover:text-[#045B3F] transition-colors"
          >
            Powered by Loop
          </a>
        </div>
      </footer>
    </div>
  );
}
