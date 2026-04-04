'use client';

const RULE_COLORS: Record<string, string> = {
  NO_MEDICAL_ADVICE: 'bg-blue-500/20 text-blue-300',
  NO_FINANCIAL_ADVICE: 'bg-indigo-500/20 text-indigo-300',
  NO_PII_LEAKAGE: 'bg-amber-500/20 text-amber-300',
  DISTRESS_ESCALATION: 'bg-red-500/20 text-red-300',
  HONEST_AI_DISCLOSURE: 'bg-purple-500/20 text-purple-300',
  UNKNOWN_RULE: 'bg-gray-500/20 text-gray-200'
};

type Props = {
  rows: any[];
};

export default function ArmorIQLog({ rows }: Props) {
  if (!rows.length) {
    return (
      <div className="soft-card p-6 text-center">
        <p className="mb-2 text-2xl text-emerald-400">✓</p>
        <p className="text-emerald-300">All conversations safe</p>
      </div>
    );
  }

  return (
    <div className="soft-card overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-gray-300">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Rule</th>
            <th className="px-4 py-3">What was blocked</th>
            <th className="px-4 py-3">What was said instead</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id} className="border-t border-border hover:bg-white/5">
              <td className="px-4 py-3 text-gray-400">{new Date(row.timestamp || row.created_at).toLocaleString('en-IN')}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-1 text-xs ${RULE_COLORS[row.rule_id] || 'bg-gray-600 text-gray-100'}`}>
                  {row.rule_id}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-200">{row.original_intent}</td>
              <td className="px-4 py-3 text-gray-300">{row.response_used}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
