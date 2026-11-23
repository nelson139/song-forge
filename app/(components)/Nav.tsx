import React from "react";
import Link from "next/link";

const Nav = () => {
  return (
    <nav className="flex items-center w-full py-6">
      <div className="flex flex-row items-center">
        <div className="size-16 mx-8 bg-center bg-[url('../public/logo.svg')] bg-cover"></div>
        <div className="py-4 text-2xl font-bold">
          <h1 className="text-2xl text-white font-bold">Song Forge</h1>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
