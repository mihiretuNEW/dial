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
  { id: '1', name: '+1 484-737-1678', number: '+14847371678', time: '10:27 PM', type: 'missed', sim: 2 },
  { id: '2', name: 'ጮጋ', number: '0987654321', time: '07:37 PM', type: 'incoming', sim: 1 },
  { id: '3', name: 'ሰላም 🐄', number: '0900112233', time: '01:09 PM', type: 'missed', sim: 2 },
  { id: '4', name: 'Dani Class', number: '0912345678', time: '08:43 AM', type: 'incoming', sim: 2 },
  { id: '5', name: 'Enat 💖💖', number: '0987111222', time: '08:21 AM', type: 'incoming', sim: 1 },
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
    className="flex flex-col items-center justify-center active:bg-zinc-800/30 rounded-full transition-colors h-[72px] w-full"
    id={`btn-${digit}`}
  >
    <span className="text-[30px] font-normal leading-none text-white">{digit}</span>
    {sub && <span className="text-[10px] text-zinc-500 font-medium tracking-tight uppercase mt-1">{sub}</span>}
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
    setIsKeypadOpen(false);
    setDialedNumber('');
    
    if (number === '*889#') {
      setTimeout(() => {
        setUssdRunning(null);
        setUssdStep('CBE_LOGIN_PIN');
        setUssdResult('SHOW');
      }, 2500);
    } else if ((number.startsWith('*') || number.startsWith('#')) && number.endsWith('#')) {
      setTimeout(() => {
        setUssdRunning(null);
        setUssdResult(`USSD Code Executed:\n${number}\n\nBalance: 124.50 ETB\nValid until: 2026-12-31`);
        setUssdStep('GENERIC');
      }, 2000);
    } else {
      setTimeout(() => setUssdRunning(null), 1000);
    }
  };

  const handleUssdAction = () => {
    const input = ussdInput;
    setUssdInput(''); // Always clear input after send
    
    setUssdRunning('...loading');
    
    setTimeout(() => {
      setUssdRunning(null);
      
      if (ussdStep === 'CBE_LOGIN_PIN') {
        if (input === '1997') {
          setUssdStep('CBE_MAIN_MENU');
        } else {
          setUssdStep('CBE_LOGIN_PIN'); // Keep asking on wrong pin for this demo
          alert('Invalid PIN. Use 1997.');
        }
      } 
      else if (ussdStep === 'CBE_MAIN_MENU') {
        if (input === '2') { // Transfer to CBE
          setUssdStep('CBE_SENDER_NAME');
        } else {
          closeDialog();
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
        setUssdStep('CBE_AMOUNT_ENTRY');
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
          setUssdStep('CBE_SUCCESS');
        } else {
          alert('Invalid PIN.');
        }
      }
      else {
        closeDialog();
      }
    }, 1200);
  };

  const closeDialog = () => {
    setUssdResult(null);
    setUssdStep('IDLE');
    setDialedNumber('');
    setUssdInput('');
    setUssdSessionData({});
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white relative select-none overflow-hidden">
      {/* --- Top Header --- */}
      <div className="pt-10 px-6 pb-2">
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-[32px] font-normal tracking-tight text-zinc-100">Recents</h1>
          <div className="flex gap-5">
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
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('missed')}
            className={`pb-2 px-1 transition-colors relative text-sm ${activeTab === 'missed' ? 'text-blue-400 font-medium' : 'text-zinc-500'}`}
          >
            Missed Calls
            {activeTab === 'missed' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
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
            <div className="flex items-center justify-between px-8 py-2 h-16">
              <div className="w-10">
                <MoreVertical className="w-5 h-5 text-zinc-500" />
              </div>
              
              <div className="flex-1 flex justify-center items-center overflow-hidden">
                <span className="text-[36px] font-normal tracking-tight text-white truncate max-w-full">
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
                    <Delete className="w-8 h-8" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-y-0.5 justify-items-center mt-1 px-8">
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
            <div className="flex items-center justify-between px-10 mt-0 mb-5">
              <button className="p-2 text-zinc-500">
                <Video className="w-5 h-5" />
              </button>

              <div className="flex items-center bg-[#25D366] rounded-full h-[38px] w-24 shadow-lg overflow-hidden">
                <button 
                  onClick={() => runUSSD(dialedNumber)}
                  className="flex-1 flex items-center justify-center active:bg-black/10 transition-colors border-r border-white/10 h-full relative"
                >
                  <Phone className="w-2.5 h-2.5 text-white fill-current" />
                  <span className="absolute bottom-1 right-2 text-[6px] font-bold text-white">1</span>
                </button>
                <button 
                  onClick={() => runUSSD(dialedNumber)}
                  className="flex-1 flex items-center justify-center active:bg-black/10 transition-colors h-full relative"
                >
                  <Phone className="w-2.5 h-2.5 text-white fill-current" />
                  <span className="absolute bottom-1 right-2 text-[6px] font-bold text-white">2</span>
                </button>
              </div>

              <button className="bg-[#1ebe5d] rounded-full w-[36px] h-[36px] flex items-center justify-center shadow-lg active:scale-95">
                <MessageSquare className="w-3.5 h-3.5 text-white fill-current" />
              </button>

              <button 
                onClick={() => setIsKeypadOpen(false)}
                className="p-2 text-zinc-500 active:text-white"
              >
                <div className="grid grid-cols-3 gap-0.5">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-1 h-1 bg-zinc-400 rounded-full" />
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
          className="fixed bottom-24 right-8 bg-[#25D366] p-5 rounded-full shadow-2xl active:scale-95"
        >
          <div className="grid grid-cols-3 gap-1">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 bg-white rounded-full" />
            ))}
          </div>
        </button>
      )}

      {/* --- Bottom Navigation --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-black flex justify-around py-3 h-[80px] items-start border-t border-zinc-900/50">
        <button className="flex flex-col items-center gap-1.5 group">
          <div className="p-1 px-5 rounded-full bg-blue-500/15">
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-[11px] font-medium text-blue-500">Recents</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 group text-zinc-500">
          <div className="p-1 px-5">
            <User className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-medium">Contacts</span>
        </button>
      </div>

      {/* --- USSD UI Layer --- */}
      <AnimatePresence mode="wait">
        {ussdRunning ? (
          <motion.div 
            key="ussd-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent pointer-events-none"
          >
            <div className="bg-[#1C1C1E] text-zinc-100 px-8 py-8 rounded-[2.5rem] flex items-center gap-6 shadow-2xl border border-zinc-800/50 w-[85%] max-w-xs">
              <div className="flex gap-2">
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="w-2.5 h-2.5 bg-zinc-400 rounded-full" 
                />
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                  className="w-2.5 h-2.5 bg-zinc-400 rounded-full" 
                />
              </div>
              <span className="text-xl font-normal text-zinc-300">USSD code running...</span>
            </div>
          </motion.div>
        ) : ussdResult ? (
          <motion.div 
            key="ussd-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 bg-black/60 z-[95] flex items-center justify-center p-6"
          >
            <div className="bg-[#2C2C2E] w-full max-w-xs rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="p-6">
                {/* --- Step: PIN Login --- */}
                {ussdStep === 'CBE_LOGIN_PIN' && (
                  <>
                    <p className="text-zinc-200 text-[18px] leading-[1.4] mb-8 font-normal">
                      Welcome to CBE Mobile Banking. Please enter your PIN to login:
                    </p>
                    <div className="relative mb-4">
                      <input 
                        type="password" autoFocus 
                        value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-2xl font-light py-1 text-white tracking-[0.4em]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-500" />
                    </div>
                  </>
                )}

                {/* --- Step: Main Menu --- */}
                {ussdStep === 'CBE_MAIN_MENU' && (
                  <>
                    <div className="text-zinc-200 text-[18px] leading-[1.6] mb-8 font-normal whitespace-pre">
                      {"1:My Account\n2:Transfer to CBE Account\n3:Beneficiary\n4:Own Account Transfer\n5:Airtime\n6:Other Transfers\n7:CBEBirr\n8:Bills & Utilities\n9:Travel\n10:Next"}
                    </div>
                    <div className="relative mb-4">
                      <input 
                        type="text" autoFocus 
                        value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-xl font-normal py-1 text-white"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-500" />
                    </div>
                  </>
                )}

                {/* --- Step: Sender Name --- */}
                {ussdStep === 'CBE_SENDER_NAME' && (
                  <>
                    <p className="text-zinc-200 text-[18px] leading-[1.4] mb-8 font-normal">
                      Please enter account you want to transfer
                    </p>
                    <div className="relative mb-4">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-xl font-normal py-1 text-white"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-500" />
                    </div>
                  </>
                )}

                {/* --- Step: Receiver Name --- */}
                {ussdStep === 'CBE_RECEIVER_NAME' && (
                  <>
                    <p className="text-zinc-200 text-[18px] leading-[1.4] mb-8 font-normal">
                      Enter Receiver Name:
                    </p>
                    <div className="relative mb-4">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-xl font-normal py-1 text-white"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-500" />
                    </div>
                  </>
                )}

                {/* --- Step: Receiver Account --- */}
                {ussdStep === 'CBE_RECEIVER_ACCOUNT' && (
                  <>
                    <p className="text-zinc-200 text-[18px] leading-[1.4] mb-8 font-normal">
                      Please enter account you want to transfer:
                    </p>
                    <div className="relative mb-4">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-xl font-normal py-1 text-white"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-500" />
                    </div>
                  </>
                )}

                {/* --- Step: Amount Entry --- */}
                {ussdStep === 'CBE_AMOUNT_ENTRY' && (
                  <>
                    <p className="text-zinc-200 text-[18px] leading-[1.4] mb-8 font-normal">
                      {ussdSessionData.senderName} ETB Education savin-0037 to {ussdSessionData.receiverName} ETB Saving Account-{ussdSessionData.receiverAcc.slice(-4)}{"\n"}
                      Enter Amount
                    </p>
                    <div className="relative mb-4">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-xl font-normal py-1 text-white"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-500" />
                    </div>
                  </>
                )}

                {/* --- Step: Reason Entry --- */}
                {ussdStep === 'CBE_REASON_ENTRY' && (
                  <>
                    <p className="text-zinc-200 text-[18px] leading-[1.4] mb-8 font-normal">
                      Enter Reason:
                    </p>
                    <div className="relative mb-4">
                      <input 
                        type="text" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-xl font-normal py-1 text-white"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-500" />
                    </div>
                  </>
                )}

                {/* --- Step: Final PIN --- */}
                {ussdStep === 'CBE_FINAL_PIN' && (
                  <>
                    <p className="text-zinc-200 text-[18px] leading-[1.4] mb-8 font-normal">
                      Confirm transaction with PIN:
                    </p>
                    <div className="relative mb-4">
                      <input 
                        type="password" autoFocus value={ussdInput} onChange={(e) => setUssdInput(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-2xl font-light py-1 text-white tracking-[0.4em]"
                      />
                      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-500" />
                    </div>
                  </>
                )}

                {/* --- Step: Success Message --- */}
                {ussdStep === 'CBE_SUCCESS' && (
                  <>
                    <p className="text-zinc-100 text-[18px] font-normal leading-[1.6] mb-8">
                      Completed ETB{((ussdSessionData.amount || 0) + 0.61).toFixed(2)} transfer From {ussdSessionData.senderName} to {ussdSessionData.receiverName}-{ussdSessionData.receiverAcc.slice(-4)}. To {ussdSessionData.reason} on {getTodayDate()} {generateTxId()} Service Charge{"\n"}
                      #:Next
                    </p>
                    <div className="relative mb-4">
                      <input type="text" autoFocus className="w-full bg-transparent border-none outline-none text-xl font-normal py-1 text-white" />
                      <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-blue-500" />
                    </div>
                  </>
                )}

                {/* --- Step: Generic USSD --- */}
                {ussdStep === 'GENERIC' && (
                  <div className="text-zinc-100 text-[18px] font-normal whitespace-pre-wrap leading-[1.6]">
                    {ussdResult}
                  </div>
                )}
              </div>

                {/* --- Nav Buttons --- */}
              <div className="flex border-t border-zinc-700/50 h-14">
                <button 
                  onClick={closeDialog}
                  className="flex-1 text-blue-500 text-lg font-medium active:bg-zinc-700/30 transition-colors"
                >
                  Cancel
                </button>
                <div className="w-[0.5px] bg-zinc-700/50 h-full" />
                <button 
                  onClick={ussdStep === 'CBE_SUCCESS' || ussdStep === 'GENERIC' ? closeDialog : handleUssdAction}
                  className="flex-1 text-blue-500 text-lg font-medium active:bg-zinc-700/30 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
