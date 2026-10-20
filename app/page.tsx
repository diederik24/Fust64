'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { getDashboardStats, getRecenteMutaties } from './actions';
import { TrendingUp } from 'lucide-react';

function PartijenDonut({
  klanten,
  leveranciers,
}: {
  klanten: number;
  leveranciers: number;
}) {
  const [hoverKey, setHoverKey] = useState<'klant' | 'leverancier' | null>(null);
  const totaal = klanten + leveranciers;
  const size = 220;
  const stroke = 26;
  const radius = (size - stroke) / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const segments =
    totaal === 0
      ? []
      : klanten === 0
        ? [{ key: 'leverancier' as const, label: 'Leverancier', value: leveranciers, color: '#9CA3AF' }]
        : leveranciers === 0
          ? [{ key: 'klant' as const, label: 'Klant', value: klanten, color: '#2563EB' }]
          : [
              { key: 'klant' as const, label: 'Klant', value: klanten, color: '#2563EB' },
              { key: 'leverancier' as const, label: 'Leverancier', value: leveranciers, color: '#9CA3AF' },
            ];

  let offset = 0;
  const drawn = segments.map((seg) => {
    const length = Math.max(0.01, (seg.value / totaal) * circumference);
    const item = { ...seg, length, offset };
    offset += length;
    return item;
  });

  const hovered = drawn.find((seg) => seg.key === hoverKey) || null;
  const centerValue = hovered ? hovered.value : totaal;
  const centerLabel = hovered ? hovered.label : 'partijen';

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-10">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#F3F4F6"
            strokeWidth={stroke}
          />

          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {drawn.map((seg) => {
              const isHovered = hoverKey === seg.key;
              const isDimmed = hoverKey !== null && !isHovered;
              return (
                <circle
                  key={seg.key}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isHovered ? stroke + 4 : stroke}
                  strokeLinecap="butt"
                  strokeDasharray={`${seg.length} ${circumference}`}
                  strokeDashoffset={-seg.offset}
                  opacity={isDimmed ? 0.35 : 1}
                  className="cursor-pointer transition-[stroke-width,opacity] duration-150"
                  style={{ pointerEvents: 'stroke' }}
                  onMouseEnter={() => setHoverKey(seg.key)}
                  onMouseLeave={() => setHoverKey(null)}
                >
                  <title>{`${seg.label}: ${seg.value}`}</title>
                </circle>
              );
            })}
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-[34px] leading-none font-semibold tracking-tight tabular-nums ${
              hovered?.key === 'klant'
                ? 'text-blue-600'
                : hovered?.key === 'leverancier'
                  ? 'text-gray-700'
                  : 'text-gray-900'
            }`}
          >
            {centerValue}
          </span>
          <span className="mt-1.5 text-[11px] text-gray-400 tracking-wide">{centerLabel}</span>
        </div>
      </div>

      <div className="flex flex-col w-full max-w-xs">
        <div
          className={`flex items-center justify-between gap-6 py-3 transition-opacity ${
            hoverKey === 'leverancier' ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-blue-600" />
            <span className="text-sm text-gray-600">Klant</span>
          </div>
          <span className="text-xl font-semibold tabular-nums text-blue-600">{klanten}</span>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div
          className={`flex items-center justify-between gap-6 py-3 transition-opacity ${
            hoverKey === 'klant' ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-gray-400" />
            <span className="text-sm text-gray-600">Leverancier</span>
          </div>
          <span className="text-xl font-semibold tabular-nums text-gray-900">{leveranciers}</span>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />;
}

function PartijenDonutSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-10">
      <Skeleton className="h-[220px] w-[220px] shrink-0 rounded-full" />
      <div className="flex flex-col w-full max-w-xs gap-3">
        <div className="flex items-center justify-between py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-10" />
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div className="flex items-center justify-between py-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-10" />
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totaalPartijen: 0,
    totaalKlanten: 0,
    totaalLeveranciers: 0,
    totaalGeladen: 0,
    totaalGelost: 0,
    tegoedArnoStraver: 0,
  });
  const [recenteMutaties, setRecenteMutaties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [dashboardStats, recente] = await Promise.all([
        getDashboardStats(),
        getRecenteMutaties(5),
      ]);

      setStats(dashboardStats);
      setRecenteMutaties(recente);
    } catch (err: any) {
      console.error('Dashboard: Error loading data:', err);
      setError(err?.message || 'Fout bij laden van data. Controleer de console voor meer details.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">Overzicht van fust beheer</p>
            </div>
            <div>
              <svg className="icon animated-s-ferris-wheel">
                <use xlinkHref="/content/img/sprite/sprite.symbol.svg#svg-s-ferris-wheel"></use>
              </svg>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold">Fout:</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Probeer opnieuw
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="lg:col-span-2"
          >
            <div className="h-full rounded-lg p-6 sm:p-7 bg-white border border-gray-200 shadow-sm">
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700">Partijen</p>
                <p className="text-xs text-gray-400 mt-0.5">Verdeling klant en leverancier</p>
              </div>
              {loading ? (
                <PartijenDonutSkeleton />
              ) : (
                <PartijenDonut
                  klanten={stats.totaalKlanten}
                  leveranciers={stats.totaalLeveranciers}
                />
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <div className="h-full rounded-lg p-6 sm:p-7 flex flex-col bg-white border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Tegoed Straver</p>
                  <p className="text-xs text-gray-400 mt-0.5">Positieve saldi klanten</p>
                </div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1 flex flex-col justify-center">
                {loading ? (
                  <>
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="mt-3 h-4 w-44" />
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-semibold tracking-tight text-green-700 tabular-nums leading-none">
                      {stats.tegoedArnoStraver.toLocaleString('nl-NL')}
                    </p>
                    <p className="mt-3 text-sm text-gray-500">CC openstaand tegoed</p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recente Mutaties</CardTitle>
              <CardDescription>Laatste 5 mutaties</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-3">
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recenteMutaties.length === 0 ? (
                <p className="text-gray-500">Geen mutaties gevonden</p>
              ) : (
                <div className="space-y-4">
                  {recenteMutaties.map((mutatie, index) => (
                    <motion.div
                      key={mutatie.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + index * 0.05 }}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="mb-3">
                        <p className="font-semibold">{mutatie.partij_nummer} - {mutatie.partij_naam || 'Geen naam'}</p>
                        <p className="text-sm text-gray-500">{new Date(mutatie.datum).toLocaleDateString('nl-NL')}</p>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="text-gray-700">CC-TAG6: <span className="font-semibold">{mutatie.gelost_cactag6 || 0}</span></p>
                        <p className="text-gray-700">Bleche: <span className="font-semibold">{mutatie.gelost_bleche || 0}</span></p>
                        <p className="text-gray-700">CC-TAG6: <span className="font-semibold">{mutatie.geladen_cactag6 || 0}</span></p>
                        <p className="text-gray-700">Bleche: <span className="font-semibold">{mutatie.geladen_bleche || 0}</span></p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
