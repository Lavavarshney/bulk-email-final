import React from 'react';
import { 
  AlertCircle, Sparkles, Rocket, Crown, 
  Mail, BarChart, Clock, Percent, ArrowRight,
  Star, Zap, Diamond
} from 'lucide-react';


const UsageStats = ({ tier = 'free', emailsSent = 0 }) => {
  const tierInfo = {
    free: {
      limit: 10,
      color: 'bg-gradient-to-r from-blue-400 to-blue-600',
      hoverColor: 'hover:from-blue-500 hover:to-blue-700',
      icon: Star,
      name: 'Free Tier',
      description: 'Perfect for getting started',
      features: ['10 emails/month', 'Basic templates', 'Email support']
    },
    basic: {
      limit: 12,
      color: 'bg-gradient-to-r from-green-500 to-green-700',
      hoverColor: 'hover:from-green-600 hover:to-green-800',
      icon: Rocket,
      name: 'Basic Plan',
      description: 'Great for small businesses',
      features: ['100 emails/month', 'Premium templates', 'Priority support'],
     upgradeLink: 'https://myappstore.lemonsqueezy.com/buy/45f80958-7809-49ef-8a3f-5aa75851adc3'
    },
    premium: {
      limit: 1000,
      color: 'bg-gradient-to-r from-purple-400 to-purple-600',
      hoverColor: 'hover:from-purple-500 hover:to-purple-700',
      icon: Diamond,
      name: 'Premium Plan',
      description: 'Ideal for growing teams',
      features: ['1,000 emails/month', 'Custom templates', '24/7 support'],
     upgradeLink:'https://myappstore.lemonsqueezy.com/buy/2f666a6a-1ebb-4bdb-bfae-2e942ba9d12a'
    },
  
  };

  const currentTier = tierInfo[tier];
  const limit = currentTier.limit;
  const percentage = (emailsSent / limit) * 100;
  const remaining = limit - emailsSent;
  const Icon = currentTier.icon;

  return (
    <div className="space-y-8">
      {/* Current Plan Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 transform translate-x-32 -translate-y-32">
          <div className={`${currentTier.color} opacity-10 w-full h-full rounded-full`}></div>
        </div>
        
        <div className="flex items-start space-x-6">
          <div className={`${currentTier.color} text-white p-4 rounded-xl transform transition-transform duration-300 hover:scale-110`}>
            <Icon className="w-8 h-8" />
          </div>
          
          <div className="flex-grow">
            <h3 className="text-2xl font-bold text-gray-900">{currentTier.name}</h3>
            <p className="text-gray-500">{currentTier.description}</p>
            
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span className="font-medium">{emailsSent.toLocaleString()} emails sent</span>
                  <span className="font-medium">{limit.toLocaleString()} total limit</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${currentTier.color} transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

 

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        {Object.entries(tierInfo).map(([planTier, info]) => (
          <div 
            key={planTier}
            className={`bg-white rounded-xl shadow-lg p-6 transition-all duration-300 
              hover:shadow-xl hover:transform hover:-translate-y-1 
              ${tier === planTier ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className={`${info.color} ${info.hoverColor} text-white p-3 rounded-xl w-fit 
              transition-all duration-300 transform hover:scale-110`}>
              <info.icon className="w-6 h-6" />
            </div>
            
            <h4 className="mt-4 text-xl font-bold text-gray-900">{info.name}</h4>
            <p className="text-sm text-gray-500 mt-2">{info.description}</p>
            
            <div className="mt-4 space-y-2">
              {info.features.map((feature, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2"></div>
                  {feature}
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">
                {info.limit.toLocaleString()} emails
              </span>
              {tier !== planTier &&
              (
                <a href={info.upgradeLink} target="_blank" rel="noopener noreferrer">
                <button className={`${info.color} ${info.hoverColor} text-white px-3 py-1 rounded-lg 
                  text-sm font-medium transition-all duration-300`}>
                  Upgrade
                </button>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      
    
    </div>
  );
};

export default UsageStats;
