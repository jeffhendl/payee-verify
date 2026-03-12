import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { blogPosts } from '@/lib/blog-data';

export const metadata = {
  title: 'Blog | Payee Verify',
  description: 'Insights on invoice verification, payment security, and vendor fraud prevention.',
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E8EAEC]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#045B3F] flex items-center justify-center">
              <ShieldCheck className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-[15px] text-[#1D1D1D] leading-none tracking-[-0.01em]">
                Payee Verify
              </span>
              <span className="text-[#71717A] text-[11px] block leading-none mt-0.5">by Loop</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
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

      {/* Header */}
      <div className="bg-white border-b border-[#E8EAEC]">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl font-semibold text-[#1D1D1D] tracking-[-0.02em] mb-4">Blog</h1>
          <p className="text-[#71717A] text-lg max-w-xl mx-auto leading-relaxed">
            Insights on invoice verification, payment security, and protecting your business from
            vendor fraud.
          </p>
        </div>
      </div>

      {/* Posts */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <div className="space-y-6">
          {blogPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block group">
              <article className="bg-white rounded-2xl border border-[#E8EAEC] p-8 shadow-sm hover:border-[#045B3F] transition-colors duration-200">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[13px] text-[#71717A]">{post.date}</span>
                  <span className="text-[#E8EAEC]">|</span>
                  <span className="text-[13px] text-[#71717A]">{post.readTime}</span>
                </div>
                <h2 className="text-xl font-semibold text-[#045B3F] tracking-[-0.01em] mb-2 group-hover:underline">
                  {post.title}
                </h2>
                <p className="text-[#71717A] text-[15px] leading-relaxed line-clamp-2 mb-4">
                  {post.preview}
                </p>
                <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#045B3F]">
                  Read more
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </article>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E8EAEC] bg-white">
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
