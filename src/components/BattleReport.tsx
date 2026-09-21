import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useSubscription } from '../store/useSubscription';

const BattleReport: React.FC = () => {
  const { battleReport, dismissBattleReport } = useSubscription();

  if (!battleReport) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 cursor-pointer"
      onClick={dismissBattleReport}
    >
      <div
        className="bg-dark rounded-xl border-2 border-green-500 p-6 max-w-md w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4 animate-pulse">
          <CheckCircle size={48} className="text-green-500" />
        </div>
        <h3 className="text-xl font-bold text-green-400 mb-2">{battleReport.title}</h3>
        <p className="text-light mb-6">{battleReport.message}</p>
        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-2">
            {[...Array(9)].map((_, index) => (
              <div
                key={index}
                className="w-8 h-8 bg-green-500 rounded animate-bounce"
                style={{ animationDelay: `${index * 0.1}s` }}
              />
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-4">点击任意处关闭</p>
      </div>
    </div>
  );
};

export default BattleReport;
