/**
 * Valida si la respuesta del usuario es correcta.
 * @param {string} userInput - Lo que escribió el usuario.
 * @param {string|string[]} correctAnswer - La respuesta (o lista de respuestas) correcta.
 * @returns {boolean}
 */
export const checkAnswer = (userInput, correctAnswer, synonyms = []) => {
  const contractions = {
    "i'm": "i am",
    "you're": "you are",
    "he's": "he is",
    "she's": "she is",
    "it's": "it is",
    "we're": "we are",
    "they're": "they are",
    "i've": "i have",
    "you've": "you have",
    "we've": "we have",
    "they've": "they have",
    "i'll": "i will",
    "you'll": "you will",
    "he'll": "he will",
    "she'll": "she will",
    "we'll": "we will",
    "they'll": "they will",
    "i'd": "i would",
    "you'd": "you would",
    "he'd": "he would",
    "she'd": "she would",
    "we'd": "we would",
    "they'd": "they would",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "can't": "cannot",
    "won't": "will not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
    "shouldn't": "should not",
    "wouldn't": "would not",
    "couldn't": "could not",
    "mustn't": "must not",
    "let's": "let us",
    "that's": "that is",
    "there's": "there is",
    "what's": "what is",
    "who's": "who is",
  };

  const expandContractions = (str) => {
    let output = str;
    Object.keys(contractions).forEach((key) => {
      const pattern = new RegExp(`\\b${key}\\b`, "g");
      output = output.replace(pattern, contractions[key]);
    });
    return output;
  };

  const clean = (str) => {
    const lower = (str || "").toLowerCase().trim();
    const expanded = expandContractions(lower);
    return expanded
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
      .replace(/\s{2,}/g, " ");
  };

  const userClean = clean(userInput);

  const correctList = Array.isArray(correctAnswer)
    ? correctAnswer
    : [correctAnswer];
  const allValid = [...correctList, ...synonyms].filter(Boolean);
  return allValid.some((ans) => clean(ans) === userClean);
};
