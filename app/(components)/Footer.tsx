import React from 'react'

const Footer = () => {
  return (
    <footer className="flex flex-col items-center h-20">
        <div className="w-[80%] h-0.5 bg-gray-100"></div>
      <p className="ml-4 mt-8 text-gray-100">
        Created by Nelson Polanco for {" "}
        <span className="font-semibold">
           SBU Hacks 2026
        </span>
      </p>
    </footer>
  )
}

export default Footer