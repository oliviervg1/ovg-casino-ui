import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, ShieldCheck, CreditCard, Gift, Dices, AlertTriangle, MonitorPlay, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

interface FAQProps {
  onBack: () => void;
}

const FAQ_CATEGORIES = [
  {
    id: 'account',
    title: 'Account & Registration',
    description: 'Manage your profile, security, and authentication.',
    icon: <ShieldCheck className="w-6 h-6" />,
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Creating an account is simple! Just click the "Sign In" button on the main page and authenticate using your Google account. Your profile will be instantly created and credited with a starting balance.'
      },
      {
        q: 'Can I have multiple accounts?',
        a: 'No, to ensure fair play and comply with our security policies, each player is strictly limited to one account. Multiple accounts may result in a permanent ban.'
      },
      {
        q: 'Is my personal information secure?',
        a: 'Absolutely. We use industry-standard encryption and secure authentication via Google to ensure your data is always protected.'
      }
    ]
  },
  {
    id: 'banking',
    title: 'Deposits & Withdrawals',
    description: 'Information about virtual currency, deposits, and balances.',
    icon: <CreditCard className="w-6 h-6" />,
    questions: [
      {
        q: 'How do I deposit funds?',
        a: 'Currently, OVG Casino operates with virtual currency for entertainment purposes. You receive a starting balance upon registration, and can earn more through gameplay.'
      },
      {
        q: 'Can I withdraw my winnings?',
        a: 'As this is a social casino, all balances and winnings are strictly virtual and cannot be withdrawn or exchanged for real money.'
      },
      {
        q: 'What happens if I run out of credits?',
        a: 'If your balance drops to zero, a daily reload bonus will automatically be applied to your account the next time you log in.'
      }
    ]
  },
  {
    id: 'bonuses',
    title: 'Bonuses & Promotions',
    description: 'Learn about daily rewards, promotions, and VIP perks.',
    icon: <Gift className="w-6 h-6" />,
    questions: [
      {
        q: 'How do wagering requirements work?',
        a: 'Since we use virtual currency, there are no complex wagering requirements! Any bonuses you receive are instantly added to your playable balance.'
      },
      {
        q: 'Do you offer a VIP program?',
        a: 'We are currently developing a comprehensive VIP loyalty program that will reward our most active players with exclusive themes, higher daily bonuses, and special avatars.'
      }
    ]
  },
  {
    id: 'games',
    title: 'Games & Fairness',
    description: 'Details on game fairness, RNG, RTP, and supported devices.',
    icon: <Dices className="w-6 h-6" />,
    questions: [
      {
        q: 'Are the games fair?',
        a: 'Yes. All our games use a certified Random Number Generator (RNG) to ensure that every spin, card draw, and bingo call is completely random and unbiased.'
      },
      {
        q: 'What is the Return to Player (RTP)?',
        a: 'Our games are designed with competitive RTP rates typical of premium social casinos, generally ranging between 95% and 98% depending on the specific game and theme.'
      },
      {
        q: 'Can I play on my mobile device?',
        a: 'Yes! OVG Casino is fully optimized for mobile browsers, offering a seamless experience across desktop, tablet, and smartphone devices.'
      }
    ]
  },
  {
    id: 'responsible',
    title: 'Responsible Gaming',
    description: 'Tools and limits to ensure a safe gaming experience.',
    icon: <AlertTriangle className="w-6 h-6" />,
    questions: [
      {
        q: 'How do I set limits on my account?',
        a: 'You can set daily, weekly, or monthly playtime limits by visiting your Profile settings. We encourage all players to game responsibly.'
      },
      {
        q: 'Can I self-exclude?',
        a: 'Yes. If you need a break, you can activate a self-exclusion period from your Profile. During this time, you will not be able to access any games.'
      }
    ]
  },
  {
    id: 'tech',
    title: 'Technical Issues',
    description: 'Troubleshooting for game freezes, loading issues, and bugs.',
    icon: <MonitorPlay className="w-6 h-6" />,
    questions: [
      {
        q: 'What should I do if a game freezes?',
        a: 'If a game freezes, simply refresh your browser. Your balance is updated on our secure servers after every action, so you will not lose any completed bets or winnings.'
      },
      {
        q: 'Why are the game assets loading slowly?',
        a: 'Our unique game assets are generated dynamically using Google Cloud AI. This may take a few moments upon your first visit, but assets are cached locally for lightning-fast loading on subsequent visits.'
      }
    ]
  }
];

export function FAQ({ onBack }: FAQProps) {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const toggleQuestion = (q: string) => {
    if (expandedQuestion === q) {
      setExpandedQuestion(null);
    } else {
      setExpandedQuestion(q);
    }
  };

  if (!categoryId) {
    return (
      <div className="max-w-6xl mx-auto w-full pb-16">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={onBack}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-4xl font-casino tracking-wider">Help Center & FAQ</h2>
            <p className="opacity-70 mt-1">How can we help you today?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FAQ_CATEGORIES.map((category) => (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/faq/${category.id}`)}
              className="bg-theme-card/50 hover:bg-theme-card border border-white/10 hover:border-theme-primary/50 p-6 rounded-2xl text-left transition-all flex flex-col gap-4 shadow-lg"
            >
              <div className="p-4 rounded-xl bg-theme-primary/20 text-theme-primary w-fit">
                {category.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{category.title}</h3>
                <p className="opacity-60 text-sm leading-relaxed">{category.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  const activeCategory = categoryId;

  return (
    <div className="max-w-6xl mx-auto w-full pb-16">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/faq')}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-4xl font-casino tracking-wider">Help Center & FAQ</h2>
          <p className="opacity-70 mt-1">Find answers to common questions and learn how to play.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Sidebar Categories */}
        <div className="md:col-span-4 lg:col-span-3 space-y-2">
          {FAQ_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                navigate(`/faq/${category.id}`);
                setExpandedQuestion(null);
              }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left ${
                activeCategory === category.id 
                  ? 'bg-theme-primary text-white shadow-lg' 
                  : 'bg-theme-card/50 hover:bg-theme-card opacity-70 hover:opacity-100'
              }`}
            >
              <div className={activeCategory === category.id ? 'text-white' : 'text-theme-primary'}>
                {category.icon}
              </div>
              <span className="font-medium">{category.title}</span>
            </button>
          ))}
          
          <div className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-theme-primary/20 to-transparent border border-theme-primary/30">
            <HelpCircle className="w-8 h-8 text-theme-primary mb-3" />
            <h3 className="text-lg font-bold mb-2">Still need help?</h3>
            <p className="text-sm opacity-70 mb-4">Our support team is available 24/7 to assist you with any issues.</p>
            <button className="w-full py-2 rounded-lg bg-theme-primary hover:bg-theme-primary/80 transition-colors font-medium text-sm">
              Contact Support
            </button>
          </div>
        </div>

        {/* FAQ Content */}
        <div className="md:col-span-8 lg:col-span-9">
          <div className="bg-theme-card backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl">
            {FAQ_CATEGORIES.map((category) => (
              category.id === activeCategory && (
                <motion.div 
                  key={category.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10">
                    <div className="p-3 rounded-xl bg-theme-primary/20 text-theme-primary">
                      {category.icon}
                    </div>
                    <h3 className="text-2xl font-bold">{category.title}</h3>
                  </div>

                  <div className="space-y-4">
                    {category.questions.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="border border-white/10 rounded-xl overflow-hidden bg-black/20 transition-colors hover:bg-black/30"
                      >
                        <button
                          onClick={() => toggleQuestion(item.q)}
                          className="w-full flex items-center justify-between p-5 text-left"
                        >
                          <span className="font-medium text-lg pr-8">{item.q}</span>
                          <motion.div
                            animate={{ rotate: expandedQuestion === item.q ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex-shrink-0 text-theme-primary"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </motion.div>
                        </button>
                        
                        <AnimatePresence>
                          {expandedQuestion === item.q && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="p-5 pt-0 opacity-70 leading-relaxed border-t border-white/5">
                                {item.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
