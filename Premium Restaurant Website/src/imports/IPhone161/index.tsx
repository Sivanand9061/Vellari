function Group() {
  return (
    <div className="absolute contents left-[43px] top-[746px]">
      <div className="absolute bg-[#156734] h-[80px] left-[43px] rounded-[24px] top-[746px] w-[308px]" />
      <p className="[word-break:break-word] absolute font-['Montserrat:Medium',sans-serif] font-medium h-[33.31px] leading-[normal] left-[105px] text-[27.884px] text-white top-[769.53px] tracking-[-1.1154px] w-[184px]">Explore Menu</p>
    </div>
  );
}

function Group1() {
  return (
    <div className="-translate-x-1/2 absolute contents left-[calc(50%-6.5px)] top-[1342px]">
      <div className="-translate-x-1/2 absolute bg-[#e5dbb2] h-[288px] left-[calc(50%-94px)] rounded-[24px] shadow-[2px_2px_6.4px_0px_rgba(0,0,0,0.25)] top-[1342px] w-[163px]" />
      <div className="-translate-x-1/2 absolute bg-[#e5dbb2] h-[288px] left-[calc(50%+81px)] rounded-[24px] shadow-[2px_2px_6.4px_0px_rgba(0,0,0,0.25)] top-[1342px] w-[163px]" />
    </div>
  );
}

function Group3() {
  return (
    <div className="-translate-x-1/2 absolute contents left-[calc(50%+256px)] top-[1342px]">
      <div className="-translate-x-1/2 absolute bg-[#e5dbb2] h-[288px] left-[calc(50%+256px)] rounded-[24px] top-[1342px] w-[163px]" />
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute contents left-[-85px] top-[1292px]">
      <div className="absolute bg-[#fef8e0] h-[355px] left-[-85px] top-[1292px] w-[506px]" />
      <Group1 />
      <Group3 />
    </div>
  );
}

export default function IPhone() {
  return (
    <div className="bg-[#fffcf2] relative size-full" data-name="iPhone 16 - 1">
      <Group />
      <div className="absolute bg-[#e5dbb2] h-[223px] left-[21px] rounded-[20px] shadow-[0px_4px_10.9px_0px_rgba(0,0,0,0.21)] top-[969px] w-[218px]" />
      <div className="absolute bg-[#e5dbb2] h-[223px] left-[253px] rounded-[20px] shadow-[0px_4px_10.9px_0px_rgba(0,0,0,0.21)] top-[969px] w-[217px]" />
      <div className="absolute bg-[#d9d9d9] h-[223px] left-[484px] rounded-[20px] top-[977px] w-[218px]" />
      <p className="[word-break:break-word] absolute font-['Montserrat:SemiBold',sans-serif] font-semibold h-[21px] leading-[normal] left-[calc(50%-73.5px)] text-[#156734] text-[22.105px] top-[928px] tracking-[-0.8842px] w-[153px]">Chef’s Special</p>
      <p className="[word-break:break-word] absolute font-['Montserrat:Medium',sans-serif] font-medium h-[13.508px] leading-[normal] left-[90px] text-[#156734] text-[11.414px] top-[1171px] tracking-[-0.4565px] w-[79px]">Chicken Stew</p>
      <p className="[word-break:break-word] absolute font-['Montserrat:Medium',sans-serif] font-medium h-[14px] leading-[normal] left-[329px] text-[#156734] text-[11.414px] top-[1171px] tracking-[-0.4565px] w-[109px]">Chicken Podimas</p>
      <p className="[word-break:break-word] absolute font-['Montserrat:Bold',sans-serif] font-bold h-[24px] leading-[normal] left-[36px] text-[#156734] text-[19.566px] top-[1163px] tracking-[-0.7827px] w-[48px]">17.00</p>
      <p className="[word-break:break-word] absolute font-['Montserrat:Bold',sans-serif] font-bold h-[24px] leading-[normal] left-[268px] text-[#156734] text-[19.566px] top-[1163px] tracking-[-0.7827px] w-[52px]">14.00</p>
      <Group2 />
      <p className="[word-break:break-word] absolute font-['Montserrat:SemiBold',sans-serif] font-semibold h-[21px] leading-[normal] left-[calc(50%-61.5px)] text-[#156734] text-[22.105px] top-[1301px] tracking-[-0.8842px] w-[127px]">The Making</p>
      <div className="absolute bg-[#e5dbb2] h-[703px] left-[3px] rounded-bl-[90px] rounded-br-[90px] shadow-[6px_8px_18.4px_0px_rgba(0,0,0,0.25)] top-0 w-[393px]" />
    </div>
  );
}