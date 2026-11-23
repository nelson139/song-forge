import React from "react";

const Middle = () => {
  return (
    <>
      <div className="flex flex-col pl-16 pr-8">
        <div>
          <h1 id="about-section" className="mt-32 px-4 text-4xl leading-16 font-bold text-white">
            Link in, list out
          </h1>
          <h2 className="p-4 text-3xl text-white">
            Nothing to install or connect. Everything runs off a link you
            already have open
          </h2>
        </div>
        <div className="ml-24 mt-12 space-y-0">
          <div className="relative flex gap-x-6 pb-12 group">
            <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-[#FFDFA3] group-last:hidden"></div>
            <div className="z-10 flex items-center justify-center size-16 shrink-0 rounded-full bg-[#FFDFA3]">
              <h1 className="text-2xl font-semibold text-gray-700">1</h1>
            </div>
            <div className="pt-3 pr-8">
              <h1 className="text-gray-200 text-xl font-medium">
                Copy the track link
              </h1>
              <p className="mt-2 text-gray-400 text-sm leading-relaxed">
                Open the song in Spotify, tap Share, then copy the link to the
                song. If you&apos;re on desktop, just copy the url.
              </p>
            </div>
          </div>
          <div className="relative flex gap-x-6 pb-12 group">
            <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-[#FFDFA3] group-last:hidden"></div>

            <div className="z-10 flex items-center justify-center size-16 shrink-0 rounded-full bg-[#FFDFA3]">
              <h1 className="text-2xl font-semibold text-gray-700">2</h1>
            </div>
            <div className="pt-3 pr-8">
              <h1 className="text-gray-200 text-xl font-medium">
                Paste the link in the box
              </h1>
              <p className="mt-2 text-gray-400 text-sm leading-relaxed">
                Navigate back to the dashboard, paste the copied link directly
                into the search field, and press submit.
              </p>
            </div>
          </div>
          <div className="relative flex gap-x-6 pb-12 group">
            <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-[#FFDFA3] group-last:hidden"></div>

            <div className="z-10 flex items-center justify-center size-16 shrink-0 rounded-full bg-[#FFDFA3]">
              <h1 className="text-2xl font-semibold text-gray-700">3</h1>
            </div>
            <div className="pt-3 pr-8">
              <h1 className="text-gray-200 text-xl font-medium">
                Generate your analytics
              </h1>
              <p className="mt-2 text-gray-400 text-sm leading-relaxed">
                Wait a few seconds for the processing engine to crunch the
                metadata and review your results.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Middle;
