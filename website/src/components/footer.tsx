import { Github, Twitter } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-white">
                M
              </div>
              <span className="font-semibold text-lg">MLTrack</span>
            </div>
            <p className="text-gray-300 text-sm">
              Stop experimenting. Start shipping.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <Link href="#features" className="hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="https://github.com/EconoBen/mltrack/wiki" className="hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <Link href="https://github.com/EconoBen/mltrack" className="hover:text-white transition-colors">
                  GitHub
                </Link>
              </li>
              <li>
                <Link href="https://github.com/EconoBen/mltrack/issues" className="hover:text-white transition-colors">
                  Issues
                </Link>
              </li>
              <li>
                <Link href="https://github.com/EconoBen/mltrack/discussions" className="hover:text-white transition-colors">
                  Community
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Connect</h3>
            <div className="flex gap-4">
              <Link
                href="https://github.com/EconoBen/mltrack"
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Github className="w-5 h-5" />
              </Link>
              <Link
                href="https://twitter.com/MLTrack"
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-sm text-gray-300">
          <p>© 2025 MLTrack. Built by Ben LaBaschin.</p>
          <p>Open source under MIT License</p>
        </div>
      </div>
    </footer>
  );
}