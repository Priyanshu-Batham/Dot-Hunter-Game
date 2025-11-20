const Dice = ({ value, rolling, onRoll, disabled }) => {
  return (
    <button 
      onClick={onRoll}
      disabled={disabled}
      className={`
        relative w-20 h-20 bg-white rounded-xl border-2 border-stone-300 shadow-[0_4px_0_#d6d3d1] 
        flex items-center justify-center transition-all duration-200
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-1 hover:shadow-[0_6px_0_#d6d3d1] active:translate-y-0 active:shadow-none cursor-pointer'}
      `}
    >
      <div className={`text-4xl font-bold text-stone-700 ${rolling ? 'animate-spin' : ''}`}>
        {rolling ? '🎲' : value || '🎲'}
      </div>
      {!disabled && !rolling && value === 0 && (
        <span className="absolute -bottom-6 text-xs font-bold text-stone-500 whitespace-nowrap">Roll!</span>
      )}
    </button>
  );
};

export default Dice;