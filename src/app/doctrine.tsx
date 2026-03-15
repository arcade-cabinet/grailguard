/**
 * @module doctrine
 *
 * Doctrine skill-tree screen for meta-progression. Each doctrine node is a
 * permanent blessing (up to level 5) purchased with coins earned across runs.
 * Nodes affect starting gold, faith bonuses, unit stats, passive income,
 * and construction costs.
 */
import { useNavigate } from 'react-router-dom';
import { purchaseDoctrineNode, useDoctrineNodes, useMetaProgress } from '../db/meta';
import { t } from '../i18n';

const DOCTRINES = [
  {
    nodeId: 'crown_tithe',
    title: 'Crown Tithe',
    description: 'Begin each run with richer coffers from the royal levy.',
    baseCost: 100,
  },
  {
    nodeId: 'faithward',
    title: 'Faithward',
    description: 'The sanctum receives stronger blessings and steadier resolve.',
    baseCost: 150,
  },
  {
    nodeId: 'iron_vanguard',
    title: 'Iron Vanguard',
    description: 'Frontline companies muster with heavier martial discipline.',
    baseCost: 200,
  },
  {
    nodeId: 'tax_collection',
    title: 'Tax Collection',
    description: 'Generate additional gold passively after each wave.',
    baseCost: 100,
  },
  {
    nodeId: 'masonry',
    title: 'Masonry',
    description: 'Fortifications and barricades are cheaper to construct.',
    baseCost: 120,
  },
] as const;

export function DoctrineScreen() {
  const navigate = useNavigate();
  const { coins } = useMetaProgress();
  const nodes = useDoctrineNodes();
  const levelMap = new Map(nodes.map((node) => [node.nodeId, node.level]));

  return (
    <div className="flex min-h-screen flex-col bg-[#140d09] px-5 pb-6 pt-14">
      <div className="rounded-[28px] border border-[#6b4a2f] bg-[#241711]/95 px-5 py-5">
        <p className="text-xs font-bold uppercase tracking-[4px] text-[#b98b52]">
          {t('doctrine_header')}
        </p>
        <h1 className="mt-2 text-4xl font-bold text-[#f0dfbe]">{t('doctrine_title')}</h1>
        <p className="mt-2 text-sm text-[#d8c3a2]">
          {t('doctrine_treasury_label')} {coins} 🪙
        </p>
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-3 overflow-auto pb-4">
        {DOCTRINES.map((node) => {
          const level = levelMap.get(node.nodeId) ?? 0;
          const cost = node.baseCost * (level + 1);
          const isMaxed = level >= 5;
          const canAfford = coins >= cost;

          return (
            <div key={node.nodeId} className="rounded-2xl border border-[#8a6a44] bg-[#eadcc3] p-4">
              <h3 className="text-xl font-bold text-[#3e2723]">
                {node.title} (Lv. {level}/5)
              </h3>
              <p className="mt-1 text-sm text-[#6e4e31]">{node.description}</p>
              <div className="mt-3 flex flex-row items-center justify-between">
                <span className="text-sm font-semibold text-[#75512d]">
                  {isMaxed ? t('doctrine_max_level') : `${cost} 🪙`}
                </span>
                <button
                  type="button"
                  disabled={isMaxed || !canAfford}
                  onClick={() => {
                    void purchaseDoctrineNode(node.nodeId, cost);
                  }}
                  className={`rounded-xl border px-4 py-2 ${
                    isMaxed
                      ? 'border-[#7b6b56] bg-[#d1c1aa]'
                      : canAfford
                        ? 'border-[#a88a44] bg-[#4a3b22]'
                        : 'border-[#8a7c6c] bg-[#8a7c6c]'
                  }`}
                  aria-label={
                    isMaxed
                      ? `${node.title} maxed`
                      : `${level > 0 ? 'Upgrade' : 'Consecrate'} ${node.title} for ${cost} coins`
                  }
                  aria-disabled={isMaxed || !canAfford}
                >
                  <span className="font-bold text-[#f7ebd0]">
                    {isMaxed
                      ? t('doctrine_maxed')
                      : level > 0
                        ? t('doctrine_upgrade')
                        : t('doctrine_consecrate')}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mx-auto rounded-2xl border border-[#a88a44] bg-[#4a3b22] px-8 py-3"
        aria-label="Return to court"
      >
        <span className="text-lg font-bold text-[#f7ebd0]">{t('btn_return_to_court')}</span>
      </button>
    </div>
  );
}
