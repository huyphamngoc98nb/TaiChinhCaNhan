import React, { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomSheet({ isOpen, onClose, children }: Props) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="keyboard-safe-bottom-sheet relative w-full max-w-md bg-white rounded-t-[24px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 ease-out overflow-y-auto">
        {/* Drag Handle */}
        <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-6" onClick={onClose} />
        
        <div className="pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
