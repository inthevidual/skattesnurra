// Historisk skattedata 1971–2020 (riksgenomsnitt)
// Alla arrayer är indexerade med [year - 1971]

export const HISTORY_START_YEAR = 1971;
export const HISTORY_END_YEAR = 2020;

// Nedre brytpunkt för statlig inkomstskatt (from 1991)
export const lowerbracket = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, 180300, 197300, 203500, 202700, 221600, 229000, 231600, 238400, 245000, 254700, 271500, 290100, 301000, 308800, 313000, 317700, 328600, 340900, 380200, 384600, 395600, 414000, 426300, 433900, 443300, 443200, 452100, 468700, 504400, 523200];

// Övre brytpunkt / värnskatt (from 1999)
export const upperbracket = [NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, 221600, 229000, 231600, 238400, 389500, 398600, 411100, 430900, 447200, 458900, 465200, 472300, 488600, 507100, 538800, 545200, 560900, 587200, 604700, 615700, 629200, 638800, 651700, 675700, 703000, NaN];

// Genomsnittlig kommunalskattesats
export const muntax = [0.2169, 0.2294, 0.2309, 0.2317, 0.2435, 0.2523, 0.2591, 0.2773, 0.2803, 0.2808, 0.2854, 0.287, 0.2908, 0.2922, 0.2928, 0.2924, 0.2935, 0.2946, 0.2969, 0.3001, 0.3, 0.2989, 0.299, 0.2992, 0.3032, 0.3047, 0.3047, 0.3046, 0.3029, 0.3039, 0.3054, 0.3052, 0.3117, 0.3151, 0.316, 0.3159, 0.3156, 0.3144, 0.3152, 0.3156, 0.3155, 0.316, 0.3173, 0.3185, 0.3199, 0.321, 0.3212, 0.3212, 0.3219, 0.3228];

// Prisbasbelopp
export const PBB = [7100, 7300, 7900, 9000, 9700, 10700, 11800, 12600, 13900, 16100, 17300, 17800, 19400, 20300, 21800, 23300, 24100, 25800, 27900, 29700, 32200, 33700, 34400, 35200, 35700, 36200, 36300, 36400, 36400, 36600, 36900, 37900, 38600, 39300, 39400, 39700, 40300, 41000, 42800, 42400, 42800, 44000, 44500, 44400, 44500, 44300, 44800, 45500, 46500, 47300];

// Genomsnittlig momsandel (skattens andel av konsumtionen)
export const vatrate = [0.117, 0.119, 0.115, 0.106, 0.116, 0.117, 0.133, 0.131, 0.129, 0.137, 0.133, 0.134, 0.131, 0.146, 0.143, 0.148, 0.149, 0.147, 0.159, 0.178, 0.155, 0.151, 0.155, 0.148, 0.134, 0.173, 0.161, 0.168, 0.168, 0.172, 0.167, 0.172, 0.172, 0.173, 0.178, 0.187, 0.189, 0.193, 0.190, 0.194, 0.192, 0.184, 0.186, 0.186, 0.186, 0.186, 0.186, 0.186, 0.186, 0.186];

// Konsumentprisindex (2020 = 1.0)
export const CPI = [0.131, 0.139, 0.148, 0.163, 0.179, 0.197, 0.219, 0.242, 0.259, 0.294, 0.33, 0.358, 0.39, 0.421, 0.452, 0.471, 0.491, 0.52, 0.553, 0.611, 0.668, 0.684, 0.715, 0.731, 0.75, 0.753, 0.757, 0.756, 0.759, 0.767, 0.786, 0.802, 0.818, 0.821, 0.825, 0.836, 0.854, 0.884, 0.881, 0.893, 0.916, 0.924, 0.924, 0.922, 0.922, 0.931, 0.947, 0.966, 0.983, 1];

// Decenniumkommentarer (Jacob Lundberg, Timbro)
export const DECADE_COMMENTARY = {
  1970: 'Under 1970-talet blev den statliga inkomstskatten allt mer progressiv och höginkomsttagares marginalskatter allt högre, bl.a. genom de blocköverskridande Hagaöverenskommelserna. Dra i inkomstreglaget så ser du att den statliga inkomstskatten steg kraftigt när inkomsten ökade. Arbetsgivaravgifterna höjdes också under årtiondet, liksom kommunalskatterna.',
  1980: 'Under 1980-talet ökade den politiska förståelsen för att höga marginalskatter är skadliga. Bl.a. genom överenskommelsen "Den underbara natten" 1981 mellan Socialdemokraterna, Centerpartiet och Folkpartiet sänktes marginalskatterna något. Arbetsgivaravgifterna för höginkomsttagare höjdes dock 1982, vilket förvärrade marginaleffekterna. Sedan dess är arbetsgivaravgifterna lika stora i procent för alla inkomster.',
  1990: 'Genom "Århundradets skattereform" 1990\u20131991 sänktes marginalskatterna rejält. Den statliga inkomstskatten träffade nu bara en minoritet och även de som betalade statlig inkomstskatt fick behålla "hälften kvar" av en löneökning. Efter 1990-talskrisen frångicks dock denna princip när värnskatten (en del av den statliga inkomstskatten) infördes 1995. Under 1990-talet infördes också allmänna egenavgifter som ett sätt att öka statens intäkter.',
  2000: 'Efter 1990-talets budgetsanering kunde skatterna sänkas under 00-talet. Under åren 2000\u20132006 infördes gradvis en skattereduktion för den allmänna pensionsavgiften (en allmän egenavgift) så att den till slut i praktiken var avskaffad. 2007 infördes jobbskatteavdraget av den nyvalda Alliansregeringen. Jobbskatteavdraget utökades sedan i ytterligare tre steg under mandatperioden.',
  2010: 'Under 2010-talet har skatteförändringarna varit små i jämförelse med tidigare decennier. Jobbskatteavdraget utökades 2014 och 2019. Den rödgröna regeringen införde en utfasning av jobbskatteavdraget 2016 med innebörden att jobbskatteavdraget minskar med inkomsten från en årslön på 600\u2009000 kr. Kommunalskatterna har ökat gradvis under årtiondet.',
  2020: 'I Januariöverenskommelsen utlovades en omfattande skattereform, men hittills har förändringarna varit små. Den största förändringen är att värnskatten avskaffades den 1 januari 2020.',
};
