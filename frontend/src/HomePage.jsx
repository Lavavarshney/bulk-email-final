import {React,useState,useEffect} from "react";
import Demo from "./Demo";
import EmailAnalyticsDashboard from "./EmailAnalytics";

const Homepage = () => {
  const [colorIndex, setColorIndex] = useState(0);
  
  // Warm, natural color progression
  const colors = [
    'text-yellow-400',    // Bright yellow
    'text-lime-400',      // Fresh lime
    'text-amber-400',     // Golden amber
    'text-green-400',     // Spring green
    'text-orange-400',    // Vibrant orange
    'text-yellow-300'     // Light yellow
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % colors.length);
    }, 2500); // Slower transition for better readability
    return () => clearInterval(interval);
  }, []);

  return (
    <>
       
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 text-white">
      {/* Navbar */}
      <header className="flex justify-between items-center px-6 py-4 bg-indigo-700 shadow-lg">
        <h1 className="text-3xl font-extrabold text-yellow-400 transform transition-all duration-300 hover:scale-105">
          Mega Mailer
        </h1>
        <nav className="flex gap-6 text-lg">
          <a href="#features" className="hover:text-yellow-300 transition-colors duration-300 hover:scale-105 transform">
            Features
          </a>
          <a href="#upload" className="hover:text-yellow-300 transition-colors duration-300 hover:scale-105 transform">
            Upload
          </a>
          <a href="#contact" className="hover:text-yellow-300 transition-colors duration-300 hover:scale-105 transform">
            Contact
          </a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="relative">
          <h1 className="text-6xl font-extrabold mb-6 flex flex-wrap justify-center items-center gap-x-4">
            <span 
              className={`transition-all duration-1000 ${colors[(colorIndex + 2) % colors.length]} 
                         hover:scale-105 cursor-default tracking-tight`}
            >
              Effortlessly
            </span>
            <span 
              className={`transition-all duration-1000 ${colors[colorIndex]} 
                         hover:scale-105 cursor-default tracking-tight
                         [text-shadow:0_1px_20px_rgb(250_204_21/_30%)]`}
            >
              Reach
            </span>
            <span 
              className={`transition-all duration-1000 ${colors[(colorIndex + 4) % colors.length]} 
                         hover:scale-105 cursor-default tracking-tight`}
            >
              Thousands
            </span>
          </h1>
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent 
                         opacity-50 pointer-events-none"></div>
        </div>

        <p className="text-lg max-w-3xl mt-6">
          Mega Mailer is the ultimate bulk email solution to simplify your email campaigns, 
          manage schedules, and maximize reach. Perfect for businesses and individuals alike!
        </p>
        <a
          href="#upload"
          className="mt-8 bg-yellow-400 text-indigo-700 font-bold py-3 px-8 rounded-lg 
                   hover:bg-yellow-300 transition-all duration-300 hover:scale-105 transform
                   shadow-lg hover:shadow-xl"
        >
          Get Started
        </a>
      </section>


        {/* File Upload Section */}
        <section id="upload" className="flex flex-col items-center justify-center py- 20 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-500 text-white">
          <h2 className="text-4xl font-extrabold mb-8">
            Upload Your Email List or Add Content
          </h2>
        </section>
      </div>

      <Demo />
      <EmailAnalyticsDashboard />

      {/* Footer Section */}
      <footer className="bg-indigo-700 text-white py-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="mb-2">© 2025 Mega Mailer. All rights reserved.</p>
          <nav className="flex justify-center gap-4">
            <a href="#features" className="hover:text-yellow-300">Features</a>
            <a href="#upload" className="hover:text-yellow-300">Upload</a>
            <a href="#contact" className="hover:text-yellow-300">Contact</a>
          </nav>
        </div>
      </footer>
    </>
  );
};

export default Homepage;
