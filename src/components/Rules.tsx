import { motion } from 'motion/react';
import { ArrowLeft, CircleDashed, Layout, Grid, BookOpen, AlertCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

interface RulesProps {
  onBack: () => void;
}

const GAME_RULES = [
  {
    id: 'roulette',
    title: 'Roulette',
    description: 'Learn the odds and bets for our themed Roulette wheels.',
    icon: <CircleDashed className="w-6 h-6" />,
    sections: [
      {
        title: 'Objective',
        content: 'The objective of Roulette is to predict where the ball will land on the spinning wheel.'
      },
      {
        title: 'How to Play',
        content: '1. Select your desired bet amount.\n2. Choose a bet type (Red, Black, Even, or Odd).\n3. Click "SPIN THE WHEEL" to place your bet and start the spin.\n4. Wait for the wheel to stop to see if you\'ve won!'
      },
      {
        title: 'Wheel Layout',
        content: 'Our Roulette wheel features 37 pockets numbered 0 through 36. The 0 pocket is Green. The remaining pockets (1-36) alternate between Red and Black.'
      },
      {
        title: 'Bet Types & Payouts',
        content: 'Currently, we offer simplified outside bets to keep the action fast and fun:\n\n• Red / Black: You bet on the color of the winning number. Pays 2x your bet.\n• Even / Odd: You bet on whether the winning number will be even or odd. Pays 2x your bet.\n\nImportant Note: If the ball lands on 0 (Green), all Red, Black, Even, and Odd bets lose.'
      }
    ]
  },
  {
    id: 'slots',
    title: 'Slots',
    description: 'Understand the paylines and jackpots for our slot machines.',
    icon: <Layout className="w-6 h-6" />,
    sections: [
      {
        title: 'Objective',
        content: 'Spin the reels to match symbols across the center payline and win multipliers on your bet.'
      },
      {
        title: 'How to Play',
        content: '1. Select your bet amount.\n2. Click "SPIN" to deduct your bet and set the 3 reels in motion.\n3. The reels will spin rapidly and come to a stop one by one.\n4. If the symbols align, you win!'
      },
      {
        title: 'Payout Structure',
        content: 'Our slots feature a straightforward, high-action payout system:\n\n• Jackpot (3 Matching Symbols): If all three reels show the exact same symbol, you hit the jackpot! Pays 10x your bet.\n• Small Win (2 Matching Symbols): If any two reels show the same symbol (e.g., reels 1 & 2, 2 & 3, or 1 & 3), you get a small win. Pays 2x your bet.\n• No Match: If all three symbols are different, the bet is lost.'
      },
      {
        title: 'Themed Symbols',
        content: 'The symbols on the reels change dynamically based on the theme you have selected in the lobby (e.g., candies for Sweets, planets for Space). The payout multipliers remain exactly the same regardless of the theme.'
      }
    ]
  },
  {
    id: 'bingo',
    title: 'Bingo',
    description: 'Master the patterns and calls for our 75-ball Bingo games.',
    icon: <Grid className="w-6 h-6" />,
    sections: [
      {
        title: 'Objective',
        content: 'Complete a winning pattern on your 5x5 Bingo card before running out of numbers.'
      },
      {
        title: 'How to Play',
        content: '1. Select your bet amount and click "Place Bet & Start" to generate a new, randomized 5x5 Bingo card.\n2. The center square is a "Free Space" and is marked automatically.\n3. Click "Draw Number" to draw a random number from 1 to 75.\n4. If the drawn number appears on your card, it will be marked automatically.\n5. Continue drawing numbers until you hit a winning pattern.'
      },
      {
        title: 'Winning Patterns',
        content: 'To win, you must complete a straight line of 5 marked squares. Valid lines include:\n\n• Horizontal Line: 5 marked squares in a single row.\n• Vertical Line: 5 marked squares in a single column.\n\n(Note: Diagonal lines are not currently counted as wins in this version).'
      },
      {
        title: 'Payouts & Game Over',
        content: '• BINGO!: Completing any valid line instantly ends the game and pays 5x your bet.\n• Game Over: If all 75 numbers are drawn and you have not completed a line, the game ends in a loss.'
      }
    ]
  }
];

export function Rules({ onBack }: RulesProps) {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  if (!gameId) {
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
            <h2 className="text-4xl font-casino tracking-wider">Game Rules</h2>
            <p className="opacity-70 mt-1">Select a game to view its comprehensive rule set.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {GAME_RULES.map((game) => (
            <motion.button
              key={game.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/rules/${game.id}`)}
              className="bg-theme-card/50 hover:bg-theme-card border border-white/10 hover:border-theme-primary/50 p-6 rounded-2xl text-left transition-all flex flex-col gap-4 shadow-lg"
            >
              <div className="p-4 rounded-xl bg-theme-primary/20 text-theme-primary w-fit">
                {game.icon}
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">{game.title}</h3>
                <p className="opacity-60 text-sm leading-relaxed">{game.description}</p>
              </div>
            </motion.button>
          ))}
        </div>
        
        <div className="mt-8 p-6 rounded-2xl bg-theme-primary/10 border border-theme-primary/20 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-theme-primary flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-bold text-lg mb-1">Prototype Notice</h4>
            <p className="text-sm opacity-80 leading-relaxed">
              OVG Casino is a prototype. Game outcomes are computed in your browser using <code className="px-1 rounded bg-black/20">Math.random()</code> (not a cryptographically secure PRNG), and balances are tracked in Firestore as virtual currency with no real-money exchange. Don't expect competition-grade fairness guarantees.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeGame = GAME_RULES.find(g => g.id === gameId);

  if (!activeGame) {
    navigate('/rules', { replace: true });
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto w-full pb-16">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/rules')}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-4xl font-casino tracking-wider">{activeGame.title} Rules</h2>
          <p className="opacity-70 mt-1">Everything you need to know to play and win.</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-theme-card backdrop-blur-xl rounded-3xl p-6 md:p-10 border border-white/10 shadow-2xl space-y-10"
      >
        <div className="flex items-center gap-4 pb-6 border-b border-white/10">
          <div className="p-4 rounded-xl bg-theme-primary/20 text-theme-primary">
            {activeGame.icon}
          </div>
          <p className="text-xl opacity-90">{activeGame.description}</p>
        </div>

        {activeGame.sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="text-2xl font-bold text-theme-primary flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {section.title}
            </h3>
            <div className="opacity-80 leading-relaxed whitespace-pre-line bg-black/20 p-6 rounded-xl border border-white/5">
              {section.content}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
