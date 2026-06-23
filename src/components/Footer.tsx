import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

export function Footer() {
  return (
    <footer className="text-[#E5CCAB] py-24 px-6 mt-0" style={{ backgroundImage: 'url(https://files.123freevectors.com/wp-content/original/150776-abstract-dark-brown-diagonal-shiny-lines-background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-12">
        <div className="md:col-span-4">
          <Link to="/" className="inline-block mb-6">
            <div className="bg-white/95 rounded-2xl p-4 inline-block shadow-md shadow-black/20">
              <img
                src="/logo.png"
                alt="P Dedigamuwa Jewellers"
                className="h-24 w-auto object-contain"
              />
            </div>
          </Link>
          <p className="opacity-60 max-w-sm text-xs leading-loose mb-8 font-serif italic text-white/50">
            Over 110 years of unparalleled craftsmanship and timeless elegance.
          </p>
          <div className="flex gap-5 text-[#D4AF37]/60">
            <a href="https://www.instagram.com/pdedigamuwajewellers/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="Instagram">
              <Instagram size={18} strokeWidth={1.5} />
            </a>
            <a href="https://www.facebook.com/dedigamuwajewellers/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="Facebook">
              <Facebook size={18} strokeWidth={1.5} />
            </a>
            <a href="https://www.tiktok.com/@p_dedigamuwa_jewellers" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" title="TikTok">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
              </svg>
            </a>
          </div>
        </div>
        
        <div className="md:col-span-2 md:col-start-6">
          <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-8 text-white/80">Discover</h4>
          <ul className="space-y-4 opacity-70 text-[13px] tracking-wide">
            <li><Link to="/collections" className="hover:text-[#D4AF37] transition-colors">Collection</Link></li>
            <li><Link to="/configurator" className="hover:text-[#D4AF37] transition-colors">Make Your Own</Link></li>
            <li><Link to="/about" className="hover:text-[#D4AF37] transition-colors">About Us</Link></li>
            <li><Link to="/materials" className="hover:text-[#D4AF37] transition-colors">Blog</Link></li>
          </ul>
        </div>
        
        <div className="md:col-span-2">
          <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-8 text-white/80">Support</h4>
          <ul className="space-y-4 opacity-70 text-[13px] tracking-wide">
            <li><a href="#" className="hover:text-[#D4AF37] transition-colors">FAQ</a></li>
            <li><a href="#" className="hover:text-[#D4AF37] transition-colors">Shipping Returns</a></li>
            <li><a href="#" className="hover:text-[#D4AF37] transition-colors">Jewelry Care</a></li>
            <li><a href="#" className="hover:text-[#D4AF37] transition-colors">Ring Guide</a></li>
            <li><a href="#" className="hover:text-[#D4AF37] transition-colors">Contact Us</a></li>
          </ul>
        </div>

        <div className="md:col-span-3">
           <h4 className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-8 text-white/80">Boutique</h4>
           <div className="opacity-70 text-[13px] leading-loose mb-6">
             <p className="font-medium text-white/90">PD Jewellers</p>
             <a href="https://maps.app.goo.gl/cNBJc2rsfr2PvYq66" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors block">
               <p>No 5 Main Street</p>
               <p>Gampaha, Sri Lanka</p>
             </a>
           </div>
           <div className="opacity-70 text-[13px] leading-loose">
             <p>0332 222 735</p>
           </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-24 pt-8 border-t border-[#D4AF37]/15 flex flex-col md:flex-row justify-between items-center text-[10px] flex-wrap gap-4 opacity-50 tracking-[0.1em]">
        <p>&copy; {new Date().getFullYear()} P DEDIGAMUWA JEWELLERS. ALL RIGHTS RESERVED.</p>
        <div className="flex gap-6 uppercase tracking-[0.15em]">
           <a href="#" className="hover:text-white">Privacy Policy</a>
           <a href="#" className="hover:text-white">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
