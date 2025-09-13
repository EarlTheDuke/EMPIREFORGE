import { type CombatResult } from '@shared/schema';
import { UNIT_TYPES } from '@/lib/game-logic';

interface CombatModalProps {
  isOpen: boolean;
  combat: CombatResult | null;
  onClose: () => void;
}

export default function CombatModal({ isOpen, combat, onClose }: CombatModalProps) {
  if (!isOpen || !combat) return null;

  const attackerType = UNIT_TYPES[combat.attackerUnit.type];
  const defenderType = UNIT_TYPES[combat.defenderUnit.type];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 combat-modal flex items-center justify-center z-50">
      <div className="retro-panel p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-terminal mb-4">COMBAT RESOLUTION</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <div>
              <div className="font-bold text-terminal">Attacker</div>
              <div>{attackerType.symbol} {combat.attackerUnit.type}</div>
              <div>Combat: {attackerType.combat}</div>
            </div>
            <div className="text-center text-2xl self-center">VS</div>
            <div className="text-right">
              <div className="font-bold text-red-500">Defender</div>
              <div>{defenderType.symbol} {combat.defenderUnit.type}</div>
              <div>Combat: {defenderType.combat}</div>
            </div>
          </div>
          
          <div className="text-center border-t border-border pt-3">
            <div className={`font-bold ${combat.attackerWins ? 'text-terminal' : 'text-red-500'}`}>
              {combat.attackerWins ? 'ATTACKER WINS!' : 'DEFENDER WINS!'}
            </div>
            {combat.capturedCity && (
              <div className="text-secondary mt-2">
                City captured at ({combat.capturedCity.x}, {combat.capturedCity.y})!
              </div>
            )}
          </div>
          
          <div className="text-center text-muted-foreground text-xs">
            Empire's classic 50/50 combat resolution
          </div>
        </div>
        <div className="flex justify-center mt-6">
          <button 
            data-testid="close-combat-modal"
            className="retro-button px-6 py-2 text-primary-foreground rounded"
            onClick={onClose}
          >
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}
