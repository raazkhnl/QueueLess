/**
 * Nepal federal-restructure controlled vocabulary.
 *
 * 7 Provinces × 77 Districts (post-2017 federal restructure).
 * Local-level (Palika) breakdown is large (~753 units) and is loaded lazily
 * when needed; the province/district list ships in-memory for fast picker UIs.
 *
 * Provinces use both their gazetted English name and Nepali name. District
 * spellings follow MoFAGA (Ministry of Federal Affairs).
 */

const PROVINCES = [
  { code: 'P1', name: 'Koshi',      nameNp: 'कोशी' },
  { code: 'P2', name: 'Madhesh',    nameNp: 'मधेश' },
  { code: 'P3', name: 'Bagmati',    nameNp: 'बागमती' },
  { code: 'P4', name: 'Gandaki',    nameNp: 'गण्डकी' },
  { code: 'P5', name: 'Lumbini',    nameNp: 'लुम्बिनी' },
  { code: 'P6', name: 'Karnali',    nameNp: 'कर्णाली' },
  { code: 'P7', name: 'Sudurpaschim', nameNp: 'सुदूरपश्चिम' },
];

const DISTRICTS = {
  P1: ['Bhojpur','Dhankuta','Ilam','Jhapa','Khotang','Morang','Okhaldhunga','Panchthar','Sankhuwasabha','Solukhumbu','Sunsari','Taplejung','Terhathum','Udayapur'],
  P2: ['Bara','Dhanusa','Mahottari','Parsa','Rautahat','Saptari','Sarlahi','Siraha'],
  P3: ['Bhaktapur','Chitwan','Dhading','Dolakha','Kathmandu','Kavrepalanchok','Lalitpur','Makwanpur','Nuwakot','Ramechhap','Rasuwa','Sindhuli','Sindhupalchok'],
  P4: ['Baglung','Gorkha','Kaski','Lamjung','Manang','Mustang','Myagdi','Nawalpur','Parbat','Syangja','Tanahun'],
  P5: ['Arghakhanchi','Banke','Bardiya','Dang','Eastern Rukum','Gulmi','Kapilvastu','Parasi','Palpa','Pyuthan','Rolpa','Rupandehi'],
  P6: ['Dailekh','Dolpa','Humla','Jajarkot','Jumla','Kalikot','Mugu','Salyan','Surkhet','Western Rukum'],
  P7: ['Achham','Baitadi','Bajhang','Bajura','Dadeldhura','Darchula','Doti','Kailali','Kanchanpur'],
};

function listProvinces() {
  return PROVINCES.map((p) => ({ ...p, districtCount: DISTRICTS[p.code]?.length || 0 }));
}

function listDistricts(provinceCode) {
  if (!provinceCode) {
    return Object.entries(DISTRICTS).flatMap(([pc, list]) => list.map((d) => ({ name: d, province: pc })));
  }
  return (DISTRICTS[provinceCode] || []).map((d) => ({ name: d, province: provinceCode }));
}

function findProvinceForDistrict(districtName) {
  if (!districtName) return null;
  const target = districtName.trim().toLowerCase();
  for (const [pc, list] of Object.entries(DISTRICTS)) {
    if (list.some((d) => d.toLowerCase() === target)) return pc;
  }
  return null;
}

module.exports = { PROVINCES, DISTRICTS, listProvinces, listDistricts, findProvinceForDistrict };
