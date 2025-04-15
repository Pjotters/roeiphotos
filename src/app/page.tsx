import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero section */}
      <div className="relative bg-blue-600">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-blue-600 opacity-80"></div>
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">RoeiFoto's</h1>
          <p className="mt-6 text-xl text-blue-100 max-w-3xl">
            Het platform dat roeiers en fotografen samenbrengt. Vind moeiteloos foto's van jezelf tijdens roeievenementen!
          </p>
          <div className="mt-10 flex space-x-6">
            <Link href="/auth/register" className="inline-block bg-white py-3 px-5 rounded-md shadow text-base font-medium text-blue-600 hover:bg-blue-50">
              Maak een account
            </Link>
            <Link href="/photos" className="inline-block bg-blue-500 bg-opacity-60 py-3 px-5 rounded-md shadow text-base font-medium text-white hover:bg-opacity-70">
              Bekijk foto's
            </Link>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="py-16 bg-gray-50 overflow-hidden lg:py-24">
        <div className="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8 lg:max-w-7xl">
          <div className="relative">
            <h2 className="text-center text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Een revolutie in het vinden van roeifoto's
            </h2>
            <p className="mt-4 max-w-3xl mx-auto text-center text-xl text-gray-500">
              Gedaan met het eindeloos zoeken naar foto's van jezelf tijdens roeievenementen.
            </p>
          </div>

          <div className="relative mt-12 lg:mt-20 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div className="relative">
              <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">
                Voor roeiers
              </h3>
              <p className="mt-3 text-lg text-gray-500">
                Vind automatisch foto's waar jij op staat, dankzij onze geavanceerde gezichtsherkenning.
              </p>

              <dl className="mt-10 space-y-10">
                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                      {/* Icon placeholder */}
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Automatische herkenning</p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    Upload je gezicht eenmalig en vind automatisch alle foto's waar jij op staat.
                  </dd>
                </div>

                <div className="relative">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Privacy gewaarborgd</p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500">
                    Jij bepaalt welke foto's zichtbaar zijn en wie ze kan zien. Volledige controle over je privacy.
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-10 -mx-4 relative lg:mt-0">
              <div className="relative mx-auto rounded-lg shadow-lg overflow-hidden">
                <div className="h-64 bg-gray-200 flex items-center justify-center">
                  {/* Placeholder for rowers image */}
                  <p className="text-gray-500">Roeiersafbeelding</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-12 sm:mt-16 lg:mt-24">
            <div className="lg:grid lg:grid-flow-row-dense lg:grid-cols-2 lg:gap-8 lg:items-center">
              <div className="lg:col-start-2">
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">Voor fotografen</h3>
                <p className="mt-3 text-lg text-gray-500">
                  Deel je foto's met de juiste doelgroep en laat je werk zien aan de roeiwereld.
                </p>

                <dl className="mt-10 space-y-10">
                  <div className="relative">
                    <dt>
                      <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Eenvoudig uploaden</p>
                    </dt>
                    <dd className="mt-2 ml-16 text-base text-gray-500">
                      Upload gemakkelijk bulk foto's en het platform zorgt voor de rest.
                    </dd>
                  </div>

                  <div className="relative">
                    <dt>
                      <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Bereik je doelgroep</p>
                    </dt>
                    <dd className="mt-2 ml-16 text-base text-gray-500">
                      Je foto's komen direct bij de juiste mensen terecht. Geen onnodig zoekwerk voor roeiers.
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="mt-10 -mx-4 relative lg:mt-0 lg:col-start-1">
                <div className="relative mx-auto rounded-lg shadow-lg overflow-hidden">
                  <div className="h-64 bg-gray-200 flex items-center justify-center">
                    {/* Placeholder for photographers image */}
                    <p className="text-gray-500">Fotografenafbeelding</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-700">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Klaar om te beginnen?</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-blue-200">
            Registreer vandaag nog en ontdek hoe eenvoudig het is om je roeifoto's te vinden en te delen.
          </p>
          <Link href="/auth/register" className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 sm:w-auto">
            Maak gratis account
          </Link>
        </div>
      </div>
    </div>
  );
}
