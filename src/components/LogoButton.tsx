import Link from 'next/link';

export default function LogoButton() {
  return (
    <Link 
      href="/"
      className="fixed top-4 left-4 w-10 h-10 bg-black bg-opacity-50 backdrop-blur-sm 
                rounded-full flex items-center justify-center text-white hover:bg-opacity-70 
                transition-all duration-200 border border-white/20 hover:border-white/40 z-50
                font-semibold text-sm"
      title="Home"
    >
      BW
    </Link>
  );
} 