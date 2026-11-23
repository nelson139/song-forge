"use client"
import React from "react";
import Image from "next/image";

const Top = () => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <div className="flex w-full items-center justify-between px-16">
        <div>
          <h2 className="p-4 text-3xl text-[#ED7C53]">
            Find more of the music you love
          </h2>
          <h1 className="px-4 text-5xl leading-16 font-bold text-white">
            Insert a track. Get the
            <br /> ones that sound like it
          </h1>
          <h3 className="p-4 text-2xl text-gray-300">
            Enter a spotify link and receive tracks that sound
            <br /> the closest, ranked from least to most similar
          </h3>

          <div className="mt-12">
            <button onClick={() => scrollToSection('input-section')} className="py-8 px-16 text-lg mx-4 bg-center bg-[url('../public/yellow-button.svg')] bg-contain bg-no-repeat outline-none hover:cursor-pointer">
              Input a song
            </button>
            <button onClick={() => scrollToSection('about-section')} className="py-8 px-16 text-lg mx-8 bg-center bg-[url('../public/grey-button.svg')] bg-contain bg-no-repeat outline-none hover:cursor-pointer">
              How it works
            </button>
          </div>
        </div>
        <div className=""></div>
        <Image
          alt="Song Forge Logo"
          src="/side-graphic.svg"
          width={340}
          height={340}
        />
      </div>
    </>
  );
};

export default Top;