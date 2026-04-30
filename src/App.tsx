/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Settings, 
  Info, 
  Phone, 
  Video, 
  MessageSquare, 
  MoreVertical, 
  Delete, 
  Clock, 
  User, 
  Dot,
  Check,
  X
} from 'lucide-react';

// --- Types ---
interface RecentCall {
  id: string;
  name: string;
  number: string;
  time: string;
  type: 'incoming' | 'outgoing' | 'missed';
  sim: 1 | 2;
  icon?: string;
}

// --- Mock Data ---
const INITIAL_RECENTS: RecentCall[] = [
  { id: '1', name: '+251 99 982 3256', number: '+251999823256', time: '4/24', type: 'missed', sim: 1 },
  { id: '2', name: 'Enat 💖💖', number: '0987654321', time: '4/24', type: 'incoming', sim: 2 },
  { id: '3', name: 'Fikru Classmate', number: '0900112233', time: '4/24', type: 'incoming', sim: 2 },
  { id: '4', name: 'Ma Bro 😎', number: '0944556677', time: '4/24', type: 'incoming', sim: 2 },
  { id: '5', name: 'Home', number: '011223344', time: '4/24', type: 'incoming', sim: 1 },
];

// --- Components ---

const KeypadButton = ({ 
  digit, 
  sub, 
  onClick 
}: { 
  digit: string; 
  sub?: string; 
  onClick: (d: string) => void 
}) => (
  <button
    onClick={() => onClick(digit)}
    className="flex flex-col items-center justify-center p-2 active:bg-zinc-800/50 rounded-full transition-colors h-22 w-24"
    id={`btn-${digit}`}
  >
    <span className="text-[34px] font-normal leading-none text-white">{digit}</span>
    {sub && <span className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase mt-1">{sub}</span>}
  </button>
);

export default function App() {
  const [dialedNumber, setDialedNumber] = useState('');
  const [isKeypadOpen, setIsKeypadOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'missed'>('all');
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>(INITIAL_RECENTS);
  const [ussdStep, setUssdStep] = useState<string>('IDLE');
  const [ussdInput, setUssdInput] = useState('');
  const [ussdSessionData, setUssdSessionData] = useState<any>({});
  const [ussdRunning, setUssdRunning] = useState<string | null>(null);
  const [ussdResult, setUssdResult] = useState<string | null>(null);

  const dialerRef = useRef<HTMLDivElement>(null);

  const handleDigitClick = (digit: string) => {
    setDialedNumber(prev => prev + digit);
  };

  const handleDelete = () => {
    setDialedNumber(prev => prev.slice(0, -1));
  };

  const handleLongDelete = () => {
    setDialedNumber('');
  };

  const generateTxId = () => {
    const today = new Date();
    const datePart = today.getDate().toString().padStart(2, '0') + (today.getMonth() + 1).toString().padStart(2, '0');
    const randomPart = Math.floor(10000000 + Math.random() * 90000000);
    return `FT${datePart}${randomPart}RT`;
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  const runUSSD = (number: string) => {
    if (!number) return;
    
    setUssdRunning(number);
    setDialedNumber('');
    
    if (number === '*889#') {
      setTimeout(() => {
        setUssdRunning(null);
        setUssdStep('CBE_LOGIN_PIN');
        setUssdResult('SHOW');
      }, 3000);
    } else if ((number.startsWith('*') || number.startsWith('#')) && number.endsWith('#')) {
      setTimeout(() => {
        setUssdRunning(null);
        setUssdResult(`USSD Code Executed:\n${number}\n\nBalance: 124.50 ETB\nValid until: 2026-12-31`);
        setUssdStep('GENERIC');
      }, 2000);
    } else {
      setTimeout(() => setUssdRunning(null), 500);
    }
  };

  const handleUssdAction = () => {
    const input = ussdInput;
    setUssdInput(''); // Always clear input after send
    
    if (ussdStep === 'CBE_LOGIN_PIN') {
      if (input === '1997') {
        setUssdRunning('...loading');
        setTimeout(() => {
          setUssdRunning(null);
          setUssdStep('CBE_MAIN_MENU');
        }, 1500);
      } else {
        alert('Invalid PIN. Use 1997.');
      }
    } 
    else if (ussdStep === 'CBE_MAIN_MENU') {
      if (input === '2') { // Transfer to CBE
        setUssdStep('CBE_SENDER_NAME');
      } else {
        setUssdStep('IDLE');
        setUssdResult(null);
      }
    }
    else if (ussdStep === 'CBE_SENDER_NAME') {
      setUssdSessionData(prev => ({ ...prev, senderName: input }));
      setUssdStep('CBE_RECEIVER_NAME');
    }
    else if (ussdStep === 'CBE_RECEIVER_NAME') {
      setUssdSessionData(prev => ({ ...prev, receiverName: input }));
      setUssdStep('CBE_RECEIVER_ACCOUNT');
    }
    else if (ussdStep === 'CBE_RECEIVER_ACCOUNT') {
      setUssdSessionData(prev => ({ ...prev, receiverAcc: input }));
      setUssdRunning('...fetching');
      setTimeout(() => {
        setUssdRunning(null);
        setUssdStep('CBE_AMOUNT_ENTRY');
      }, 1500);
    }
    else if (ussdStep === 'CBE_AMOUNT_ENTRY') {
      const amt = parseFloat(input);
      setUssdSessionData(prev => ({ ...prev, amount: amt }));
      setUssdStep('CBE_REASON_ENTRY');
    }
    else if (ussdStep === 'CBE_REASON_ENTRY') {
      setUssdSessionData(prev => ({ ...prev, reason: input }));
      setUssdStep('CBE_FINAL_PIN');
    }
    else if (ussdStep === 'CBE_FINAL_PIN') {
      if (input === '1997') {
        setUssdRunning('...processing');
        setTimeout(() => {
          setUssdRunning(null);
          setUssdStep('CBE_SUCCESS');
        }, 2000);
      } else {
        alert('Invalid PIN.');
      }
    }
    else {
      closeDialog();
    }
  };

  const closeDialog = () => {
    setUssdResult(null);
    setUssdStep('IDLE');
    setDialedNumber('');
    setUssdInput('');
    setUssdSessionData({});
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white relative select-none">
      {/* --- Top Header --- */}
      <div className="pt-10 px-6 pb-2">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-[34px] font-normal tracking-tight text-zinc-100">Recents</h1>
          <div className="flex gap-4">
            <Search className="w-5 h-5 text-zinc-300" />
            <Settings className="w-5 h-5 text-zinc-300" />
          </div>
        </div>

        <div className="flex gap-6 border-b border-zinc-900 pb-0">
          <button 
            onClick={() => setActiveTab('all')}
            className={`pb-2 px-1 transition-colors relative text-sm ${activeTab === 'all' ? 'text-blue-400 font-medium' : 'text-zinc-500'}`}
          >
            All
            {activeTab === 'all' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('missed')}
            className={`pb-2 px-1 transition-colors relative text-sm ${activeTab === 'missed' ? 'text-blue-400 font-medium' : 'text-zinc-500'}`}
          >
            Missed Calls
            {activeTab === 'missed' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
            )}
          </button>
        </div>
      </div>

      {/* --- Call List --- */}
      <div className="flex-1 overflow-y-auto px-6 no-scrollbar pb-32">
        {recentCalls
          .filter(call => activeTab === 'all' || call.type === 'missed')
          .filter(call => !dialedNumber || call.number.includes(dialedNumber) || call.name.toLowerCase().includes(dialedNumber.toLowerCase()))
          .map((call) => (
          <div key={call.id} className="flex items-center justify-between py-4 group" id={`call-${call.id}`}>
            <div className="flex items-center gap-4">
              <div className={`transition-colors ${call.type === 'missed' ? 'text-red-500' : 'text-zinc-500'}`}>
                {call.type === 'missed' ? (
                  <Phone className="w-5 h-5 fill-current rotate-[135deg]" />
                ) : (
                  <Phone className="w-5 h-5" />
                )}
              </div>
              <div className="flex flex-col">
                <h3 className={`text-[17px] font-medium tracking-wide ${call.type === 'missed' ? 'text-red-500' : 'text-zinc-100'}`}>
                  {call.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                  <div className="border border-zinc-700 rounded-sm px-1 text-[9px] leading-tight flex items-center justify-center min-w-[14px]">
                    {call.sim}
                  </div>
                  <span className="text-[13px]">{call.name.startsWith('+251') ? 'Ethiopia' : 'Mobile'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[13px] text-zinc-500">{call.time}</span>
              <div className="p-1 border border-zinc-700/50 rounded-full flex items-center justify-center">
                <Info className="w-4 h-4 text-zinc-400" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- Keypad Area --- */}
      <AnimatePresence>
        {isKeypadOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl pb-6 rounded-t-[2.5rem] border-t border-zinc-900 z-40"
            ref={dialerRef}
          >
            {/* --- Dialed Number Row --- */}
            <div className="flex items-center justify-between px-8 py-4 h-20">
              <div className="w-10">
                <MoreVertical className="w-6 h-6 text-zinc-500" />
              </div>
              
              <div className="flex-1 flex justify-center items-center overflow-hidden">
                <span className="text-[40px] font-light tracking-wide text-white truncate max-w-full">
                  {dialedNumber}
                </span>
              </div>

              <div className="w-10 flex justify-end">
                {dialedNumber && (
                  <button 
                    onClick={handleDelete}
                    onContextMenu={(e) => { e.preventDefault(); handleLongDelete(); }}
                    className="text-zinc-500 active:text-white transition-colors"
                  >
                    <Delete className="w-9 h-9" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-y-2 justify-items-center mt-2 px-4">
              <KeypadButton digit="1" sub="oo" onClick={handleDigitClick} />
              <KeypadButton digit="2" sub="abc" onClick={handleDigitClick} />
              <KeypadButton digit="3" sub="def" onClick={handleDigitClick} />
              
              <KeypadButton digit="4" sub="ghi" onClick={handleDigitClick} />
              <KeypadButton digit="5" sub="jkl" onClick={handleDigitClick} />
              <KeypadButton digit="6" sub="mno" onClick={handleDigitClick} />
              
              <KeypadButton digit="7" sub="pqrs" onClick={handleDigitClick} />
              <KeypadButton digit="8" sub="tuv" onClick={handleDigitClick} />
              <KeypadButton digit="9" sub="wxyz" onClick={handleDigitClick} />
              
              <KeypadButton digit="*" onClick={handleDigitClick} />
              <KeypadButton digit="0" sub="+" onClick={handleDigitClick} />
              <KeypadButton digit="#" onClick={handleDigitClick} />
            </div>

            {/* --- Action Buttons --- */}
            <div className="flex items-center justify-between px-6 mt-8 mb-6">
              <button className="p-2 text-zinc-500 active:text-white transition-colors">
                <Video className="w-7 h-7" />
              </button>

              <div className="flex items-center bg-green-500 rounded-full h-14 w-40 shadow-lg overflow-hidden">
                <button 
                  onClick={() => runUSSD(dialedNumber)}
                  className="flex-1 flex items-center justify-center active:bg-black/10 transition-colors border-r border-green-600/30 h-full relative"
                >
                  <Phone className="w-5 h-5 text-white fill-current" />
                  <span className="absolute bottom-1 right-2 text-[9px] font-bold text-white">1</span>
                </button>
                <button 
                  onClick={() => runUSSD(dialedNumber)}
                  className="flex-1 flex items-center justify-center active:bg-black/10 transition-colors h-full relative"
                >
                  <Phone className="w-5 h-5 text-white fill-current" />
                  <span className="absolute bottom-1 right-2 text-[9px] font-bold text-white">2</span>
                </button>
              </div>

              <button className="bg-green-500 rounded-full w-14 h-14 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                <MessageSquare className="w-6 h-6 text-white fill-current" />
              </button>

              <button 
                onClick={() => setIsKeypadOpen(false)}
                className="p-2 text-zinc-500 active:text-white transition-colors"
              >
                <div className="grid grid-cols-3 gap-1 px-1">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
                  ))}
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Floating Keypad Toggle --- */}
      {!isKeypadOpen && (
        <button 
          onClick={() => setIsKeypadOpen(true)}
          className="fixed bottom-24 right-8 bg-green-500 p-6 rounded-full shadow-2xl active:scale-95 transition-transform"
        >
          <div className="grid grid-cols-3 gap-1">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-white rounded-full" />
            ))}
          </div>
        </button>
      )}

      {/* --- Bottom Navigation --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md flex justify-around py-2 border-t border-zinc-900 h-16 items-center">
        <button className="flex flex-col items-center group text-blue-500">
          <Clock className="w-6 h-6" />
          <span className="text-[10px] font-medium">Recents</span>
        </button>
        <button className="flex flex-col items-center group text-zinc-500 active:text-zinc-300">
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">Contacts</span>
        </button>
      </div>

      {/* --- USSD Running Overlay --- */}
      <AnimatePresence>
        {ussdRunning && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-[#1C1C1E] text-zinc-100 px-10 py-10 rounded-[2.5rem] flex items-center gap-8 shadow-2xl border border-zinc-800/50 w-[85%] max-w-sm">
              <div className="flex gap-2">
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-3 h-3 bg-white rounded-full" 
                />
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.5 }}
                  className="w-3 h-3 bg-white rounded-full" 
                />
              </div>
              <span className="text-2xl font-light tracking-wide">USSD code running...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- USSD Modals State Machine --- */}
      <AnimatePresence>
        {ussdResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[90] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#2C2C2E] w-full max-w-sm rounded-[1.8rem] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)]"
            >
              <div className="p-7">
                {/* --- Step: PIN Login --- */}
                {ussdStep === 'CBE_LOGIN_PIN' && (
                  <>
                    <p className="text-zinc-200 text-lg leading-[1.4] mb-6">
                      Welcome to CBE Mobile Banking. Please enter your PIN to login:
                    </p>
                    <div className="relative">
                      <input 
                        type="password" autoFocus 
                        value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-2xl font-light py-1 text-white tracking-[0.4em]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600" />
                    </div>
                  </>
                )}

                {/* --- Step: Main Menu --- */}
                {ussdStep === 'CBE_MAIN_MENU' && (
                  <>
                    <div className="text-zinc-200 text-lg leading-[1.6] mb-6 font-light whitespace-pre">
                      {"1:My Account\n2:Transfer to CBE Account\n3:Beneficiary\n4:Own Account Transfer\n5:Airtime\n6:Other Transfers\n7:CBEBirr\n8:Bills & Utilities\n9:Travel\n10:Next"}
                    </div>
                    <div className="relative">
                      <input 
                        type="text" autoFocus 
                        value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-2xl font-light py-1 text-white"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600" />
                    </div>
                  </>
                )}

                {/* --- Step: Sender Name --- */}
                {ussdStep === 'CBE_SENDER_NAME' && (
                  <>
                    <p className="text-zinc-200 text-lg font-light mb-6">Enter Sender Name</p>
                    <div className="relative">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-2xl font-light py-1 text-white"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600" />
                    </div>
                  </>
                )}

                {/* --- Step: Receiver Name --- */}
                {ussdStep === 'CBE_RECEIVER_NAME' && (
                  <>
                    <p className="text-zinc-200 text-lg font-light mb-6">Enter Receiver Name</p>
                    <div className="relative">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-2xl font-light py-1 text-white"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600" />
                    </div>
                  </>
                )}

                {/* --- Step: Receiver Account --- */}
                {ussdStep === 'CBE_RECEIVER_ACCOUNT' && (
                  <>
                    <p className="text-zinc-200 text-lg font-light mb-6">Please enter account you want to transfer</p>
                    <div className="relative">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-2xl font-light py-1 text-white"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600" />
                    </div>
                  </>
                )}

                {/* --- Step: Amount Entry --- */}
                {ussdStep === 'CBE_AMOUNT_ENTRY' && (
                  <>
                    <p className="text-zinc-200 text-lg font-light mb-6 leading-relaxed">
                      {ussdSessionData.senderName} to {ussdSessionData.receiverName} Account - {ussdSessionData.receiverAcc.slice(-4)}{"\n"}
                      Enter Amount
                    </p>
                    <div className="relative">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-2xl font-light py-1 text-white"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600" />
                    </div>
                  </>
                )}

                {/* --- Step: Reason Entry --- */}
                {ussdStep === 'CBE_REASON_ENTRY' && (
                  <>
                    <p className="text-zinc-200 text-lg font-light mb-6 leading-relaxed">
                      {ussdSessionData.senderName} to {ussdSessionData.receiverName}{"\n"}
                      Amount: {ussdSessionData.amount}{"\n"}
                      Enter Reason
                    </p>
                    <div className="relative">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-2xl font-light py-1 text-white"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600" />
                    </div>
                  </>
                )}

                {/* --- Step: Final PIN --- */}
                {ussdStep === 'CBE_FINAL_PIN' && (
                  <>
                    <p className="text-zinc-200 text-lg font-light mb-6 leading-relaxed">
                      {ussdSessionData.senderName} to {ussdSessionData.receiverName}{"\n"}
                      Amount: {ussdSessionData.amount}{"\n"}
                      Remark: {ussdSessionData.reason}{"\n"}
                      Enter PIN to pay
                    </p>
                    <div className="relative">
                      <input 
                        type="password" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-3xl font-light py-1 text-white tracking-[0.4em]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600" />
                    </div>
                  </>
                )}

                {/* --- Step: Success Message --- */}
                {ussdStep === 'CBE_SUCCESS' && (
                  <>
                    <p className="text-zinc-100 text-lg font-light leading-relaxed mb-6">
                      Completed ETB{((ussdSessionData.amount || 0) + 0.61).toFixed(2)} transfer From {ussdSessionData.senderName} to {ussdSessionData.receiverName}-{ussdSessionData.receiverAcc.slice(-4)}. To {ussdSessionData.reason} on {getTodayDate()} {generateTxId()} Service Charge{"\n"}
                      #:Next
                    </p>
                    <div className="relative">
                      <input type="text" autoFocus className="w-full bg-transparent border-none outline-none text-2xl font-light py-1 text-white" />
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600" />
                    </div>
                  </>
                )}

                {/* --- Step: Generic USSD --- */}
                {ussdStep === 'GENERIC' && (
                  <div className="text-zinc-100 text-lg font-light whitespace-pre-wrap">
                    {ussdResult}
                  </div>
                )}
              </div>

              {/* --- Nav Buttons --- */}
              <div className="flex border-t border-zinc-700/40">
                <button 
                  onClick={closeDialog}
                  className="flex-1 py-5 text-blue-400 font-medium active:bg-white/5 transition-colors text-lg"
                >
                  Cancel
                </button>
                <div className="w-[1px] bg-zinc-700/40 self-stretch my-3" />
                <button 
                  onClick={ussdStep === 'CBE_SUCCESS' || ussdStep === 'GENERIC' ? closeDialog : handleUssdAction}
                  className="flex-1 py-5 text-blue-400 font-medium active:bg-white/5 transition-colors text-lg"
                >
                  Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
