const AL_FATIHA = 1
const AT_TAWBAH = 9

export function hasSeparateBismillah(surahId) {
  return surahId !== AL_FATIHA && surahId !== AT_TAWBAH
}

export function basmalaIsFirstAyah(surahId) {
  return surahId === AL_FATIHA
}
