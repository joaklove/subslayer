import { useState } from 'react';
import './App.css';
import DashboardHeader from './components/DashboardHeader';
import WalletPet from './components/WalletPet';
import SubscriptionList from './components/SubscriptionList';
import AddSubscriptionDialog from './components/AddSubscriptionDialog';
import { PlusCircle } from 'lucide-react';
import { SubscriptionProvider } from './store/SubscriptionContext';

function App() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddClick = () => {
    setIsAddDialogOpen(true);
  };

  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
  };

  return (
    <SubscriptionProvider>
      <div className="min-h-screen bg-gray-900 text-light">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <DashboardHeader />
          <WalletPet />
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">我的订阅</h2>
            <button
              onClick={handleAddClick}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center"
            >
              <PlusCircle size={18} className="mr-2" />
              添加订阅
            </button>
          </div>
          
          <SubscriptionList onAddClick={handleAddClick} />
          
          <AddSubscriptionDialog 
            isOpen={isAddDialogOpen} 
            onClose={handleCloseAddDialog} 
          />
          
          <footer className="mt-12 text-center text-gray-500 text-sm">
            <p>© 2026 订阅刺客 (SubSlayer)</p>
            <p className="mt-2">数据仅保存在本地设备，保护您的隐私</p>
          </footer>
        </div>
      </div>
    </SubscriptionProvider>
  );
}

export default App
