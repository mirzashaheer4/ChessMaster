import React from 'react';
import { ArrowLeft, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PageLayout = ({ title, children }: { title: string, children: React.ReactNode }) => {
  const navigate = useNavigate();
  return (
    <div 
      className="w-full min-h-screen flex flex-col items-center p-8 relative overflow-x-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #0f172a 25%, #151515 50%, #0f172a 75%, #0a0a0a 100%)',
      }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#e8b34b]/5 rounded-full blur-[100px]" />
      </div>

      {/* Back Button */}
      <div className="absolute top-8 left-8 z-10">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 group"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      <div className="max-w-3xl w-full text-center space-y-8 relative z-10 animate-fade-in-up mt-12">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#e8b34b] to-[#d4a03d] flex items-center justify-center">
            <Crown className="w-8 h-8 text-[#0a0a0a]" />
          </div>
        </div>

        <div>
           <span className="inline-block px-4 py-1.5 rounded-full bg-[#e8b34b]/10 border border-[#e8b34b]/30 text-[#e8b34b] text-xs font-semibold tracking-wider uppercase mb-4">
            ChessMaster
          </span>
          <h1 className="text-4xl md:text-5xl font-bold font-['Montserrat'] tracking-tight">
             {title}
          </h1>
        </div>

        <div className="text-left text-gray-300 space-y-6 mt-8 p-6 glass-card rounded-2xl leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Privacy = () => (
  <PageLayout title="Privacy Policy">
    <p>Last updated: April 2026</p>
    <h3 className="text-xl font-bold text-white mt-4">1. Data Collection</h3>
    <p>We collect basic information required to operate the chess platform, such as your username, email address, and match history. This allows us to maintain your rating and leaderboard standing.</p>
    <h3 className="text-xl font-bold text-white mt-4">2. Use of Information</h3>
    <p>Your information is used solely to improve our services, facilitate matchmaking, and ensure a fair gaming environment. We do not sell your personal data to third parties.</p>
    <h3 className="text-xl font-bold text-white mt-4">3. Security</h3>
    <p>We employ industry-standard security measures to protect your account and personal information from unauthorized access.</p>
  </PageLayout>
);

export const Terms = () => (
  <PageLayout title="Terms of Service">
    <p>Last updated: April 2026</p>
    <h3 className="text-xl font-bold text-white mt-4">1. User Conduct</h3>
    <p>Players are expected to maintain good sportsmanship. Toxic behavior, chat abuse, and cheating are strictly prohibited and will result in account suspension.</p>
    <h3 className="text-xl font-bold text-white mt-4">2. Fair Play</h3>
    <p>Using external assistance (chess engines, bots, etc.) during online matches against human opponents is strictly forbidden and actively monitored.</p>
    <h3 className="text-xl font-bold text-white mt-4">3. Account Responsibility</h3>
    <p>You are responsible for all activity that occurs under your account. Keep your login credentials secure.</p>
  </PageLayout>
);

export const Cookies = () => (
  <PageLayout title="Cookie Policy">
    <p>Last updated: April 2026</p>
    <p>We use cookies to enhance your chess experience on our platform.</p>
    <h3 className="text-xl font-bold text-white mt-4">1. Essential Cookies</h3>
    <p>These cookies are required for the platform to function correctly, such as maintaining your login session and saving your local board preferences.</p>
    <h3 className="text-xl font-bold text-white mt-4">2. Analytics Cookies</h3>
    <p>We use these to understand how our players use the site, helping us to optimize the interface and improve matchmaking processes.</p>
  </PageLayout>
);

export const HelpCenter = () => (
  <PageLayout title="Help Center">
    <h3 className="text-xl font-bold text-white mt-4">Frequently Asked Questions</h3>
    <ul className="list-disc pl-5 mt-2 space-y-2">
      <li><strong>How do I start a game?</strong> Simply click "Play Online" or choose a difficulty to play against the AI from the dashboard.</li>
      <li><strong>How does the rating work?</strong> We use a standard ELO rating system adjusted for different time controls. Your rating changes based on the outcome of your online matches.</li>
      <li><strong>Can I play against my friends?</strong> Yes! Use the "Friends" panel to invite friends to a private match.</li>
      <li><strong>What do I do if I find a bug?</strong> Please report any issues through our contact channels. Providing reproduction steps will greatly help our team.</li>
    </ul>
    
    <h3 className="text-xl font-bold text-white mt-8">Contact Us</h3>
    <p className="mt-2">If you need further assistance, please contact our support team at <a href="mailto:support@chessmaster.com" className="text-[#e8b34b] hover:underline">support@chessmaster.com</a>.</p>
  </PageLayout>
);
