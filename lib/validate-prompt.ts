/**
 * Validate user input to ensure it's lesson-related
 * Prevents spam, inappropriate content, and off-topic prompts
 * Supports multiple languages including Hindi, Tamil, Telugu, Marathi, Bengali, and more
 */

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Check if the prompt is lesson/education related
 */
export function validateLessonPrompt(prompt: string): ValidationResult {
  // 1. Basic checks
  if (!prompt || typeof prompt !== "string") {
    return {
      isValid: false,
      error: "Please enter a valid prompt",
    };
  }

  const trimmedPrompt = prompt.trim();

  // 2. Minimum length check
  if (trimmedPrompt.length < 10) {
    return {
      isValid: false,
      error: "Please enter a more detailed prompt (at least 10 characters)",
    };
  }

  // 3. Maximum length check
  if (trimmedPrompt.length > 1000) {
    return {
      isValid: false,
      error: "Prompt is too long (maximum 1000 characters)",
    };
  }

  // 4. Detect and remove invisible/zero-width characters
  const invisibleChars = /[\u200B-\u200D\uFEFF\u00A0]/g;
  if (invisibleChars.test(trimmedPrompt)) {
    return {
      isValid: false,
      error: "Prompt contains invisible characters. Please use normal text.",
    };
  }

  // 5. Check for excessive emojis
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (trimmedPrompt.match(emojiRegex) || []).length;
  if (emojiCount > 10) {
    return {
      isValid: false,
      error: "Too many emojis in prompt. Please use more descriptive text.",
    };
  }

  // 6. Check for spam patterns
  const spamPatterns = [
    /(.)\1{10,}/i, // Repeated characters (e.g., "aaaaaaaaaa")
    /^[^a-zA-Z0-9\s\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]+$/, // Only special characters (excluding Indic scripts)
    /test{3,}/i, // "testtesttest"
    /asdf{2,}/i, // "asdfasdf"
    /qwerty/i, // Keyboard mashing
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(trimmedPrompt)) {
      return {
        isValid: false,
        error: "Please enter a valid lesson-related prompt",
      };
    }
  }

  // 7. SQL Injection pattern detection
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b.*\b(FROM|INTO|TABLE|DATABASE)\b)/i,
    /(--|\bOR\b.*=.*\bOR\b|;\s*DROP)/i,
    /('\s*OR\s*'1'\s*=\s*'1)/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(trimmedPrompt)) {
      return {
        isValid: false,
        error: "Invalid characters or patterns detected in prompt",
      };
    }
  }

  // 8. Prompt injection detection
  const injectionPatterns = [
    /ignore\s+(previous|all|above)\s+instructions/i,
    /you\s+are\s+(now|a)\s+/i,
    /system\s*:\s*/i,
    /\[SYSTEM\]/i,
    /disregard\s+(previous|all)/i,
    /forget\s+(everything|all|previous)/i,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(trimmedPrompt)) {
      return {
        isValid: false,
        error: "Invalid prompt format detected",
      };
    }
  }

  // 9. Check for inappropriate/offensive content (English + transliterated)
  const inappropriatePatterns = [
    /\b(fuck|shit|damn|bitch|ass|sex|porn|xxx|nsfw)\b/i,
    /\b(kill|murder|death|suicide|bomb|weapon|gun)\b/i,
    /\b(hack|crack|pirate|steal|cheat|illegal)\b/i,
  ];

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(trimmedPrompt)) {
      return {
        isValid: false,
        error: "Please enter appropriate, educational content only",
      };
    }
  }

  // 10. Multi-language educational keyword detection
  const educationalKeywords = [
    // English
    /\b(lesson|learn|teach|explain|understand|study|quiz|test|exam|practice)\b/i,
    /\b(topic|subject|concept|theory|example|tutorial|guide|course)\b/i,
    /\b(education|knowledge|skill|training|instruction|demonstration)\b/i,
    /\b(what|how|why|when|where|who|which)\b/i,
    /\b(interactive|diagram|visual|step|chapter|section|activity)\b/i,
    /\b(question|answer|solve|problem|exercise|challenge)\b/i,
    /\b(math|science|history|english|language|literature|art|music)\b/i,
    /\b(physics|chemistry|biology|geography|social|computer|technology)\b/i,
    /\b(create|generate|make|build|develop|design)\b/i,
    
    // Hindi (Devanagari script)
    /(पाठ|सीखना|सिखाना|समझाना|अध्ययन|क्विज़|परीक्षा|अभ्यास)/,
    /(विषय|अवधारणा|सिद्धांत|उदाहरण|ट्यूटोरियल|पाठ्यक्रम)/,
    /(शिक्षा|ज्ञान|कौशल|प्रशिक्षण)/,
    /(क्या|कैसे|क्यों|कब|कहाँ|कौन)/,
    /(गणित|विज्ञान|इतिहास|भूगोल|भौतिकी|रसायन|जीवविज्ञान)/,
    
    // Hindi (Romanized/Transliterated)
    /\b(paath|seekhna|sikhana|samjhana|adhyayan|quiz|pariksha|abhyas)\b/i,
    /\b(vishay|avdharna|siddhant|udaharan|tutorial|pathyakram)\b/i,
    /\b(shiksha|gyaan|kaushal|prashikshan)\b/i,
    /\b(kya|kaise|kyon|kab|kahan|kaun)\b/i,
    /\b(ganit|vigyan|itihaas|bhoogol|bhautiki|rasayan|jeevvigyan)\b/i,
    
    // Tamil (Tamil script)
    /(பாடம்|கற்க|கற்பிக்க|விளக்க|புரிந்து|படிப்பு|வினாடி|தேர்வு|பயிற்சி)/,
    /(தலைப்பு|பாடம்|கருத்து|கோட்பாடு|உதாரணம்)/,
    /(கல்வி|அறிவு|திறன்|பயிற்சி)/,
    /(என்ன|எப்படி|ஏன்|எப்போது|எங்கே)/,
    /(கணிதம்|அறிவியல்|வரலாறு|புவியியல்|இயற்பியல்|வேதியியல்)/,
    
    // Telugu (Telugu script)
    /(పాఠం|నేర్చుకో|బోధించు|వివరించు|అధ్యయనం|క్విజ్|పరీక్ష|అభ్యాసం)/,
    /(విషయం|భావన|సిద్ధాంతం|ఉదాహరణ|శిక్షణ)/,
    /(విద్య|జ్ఞానం|నైపుణ్యం|శిక్షణ)/,
    /(ఏమిటి|ఎలా|ఎందుకు|ఎప్పుడు|ఎక్కడ)/,
    /(గణితం|శాస్త్రం|చరిత్ర|భౌగోళికం|భౌతిక|రసాయన)/,
    
    // Marathi (Devanagari script)
    /(धडा|शिकणे|शिकवणे|समजावणे|अभ्यास|क्विझ|परीक्षा)/,
    /(विषय|संकल्पना|सिद्धांत|उदाहरण|मार्गदर्शन)/,
    /(शिक्षण|ज्ञान|कौशल्य|प्रशिक्षण)/,
    /(काय|कसे|का|केव्हा|कुठे)/,
    /(गणित|विज्ञान|इतिहास|भूगोल|भौतिकशास्त्र)/,
    
    // Bengali (Bengali script)
    /(পাঠ|শেখা|শেখানো|ব্যাখ্যা|অধ্যয়ন|কুইজ|পরীক্ষা|অনুশীলন)/,
    /(বিষয়|ধারণা|তত্ত্ব|উদাহরণ|টিউটোরিয়াল)/,
    /(শিক্ষা|জ্ঞান|দক্ষতা|প্রশিক্ষণ)/,
    /(কী|কিভাবে|কেন|কখন|কোথায়)/,
    /(গণিত|বিজ্ঞান|ইতিহাস|ভূগোল|পদার্থবিজ্ঞান|রসায়ন)/,
    
    // Gujarati (Gujarati script)
    /(પાઠ|શીખવું|શીખવવું|સમજાવો|અભ્યાસ|ક્વિઝ|પરીક્ષા)/,
    /(વિષય|ખ્યાલ|સિદ્ધાંત|ઉદાહરણ)/,
    /(શિક્ષણ|જ્ઞાન|કુશળતા|તાલીમ)/,
    /(શું|કેવી રીતે|શા માટે|ક્યારે|ક્યાં)/,
    /(ગણિત|વિજ્ઞાન|ઇતિહાસ|ભૂગોળ|ભૌતિકશાસ્ત્ર)/,
    
    // Kannada (Kannada script)
    /(ಪಾಠ|ಕಲಿಯಿರಿ|ಕಲಿಸಿ|ವಿವರಿಸಿ|ಅಧ್ಯಯನ|ಕ್ವಿಜ್|ಪರೀಕ್ಷೆ)/,
    /(ವಿಷಯ|ಪರಿಕಲ್ಪನೆ|ಸಿದ್ಧಾಂತ|ಉದಾಹರಣೆ)/,
    /(ಶಿಕ್ಷಣ|ಜ್ಞಾನ|ಕೌಶಲ್ಯ|ತರಬೇತಿ)/,
    /(ಏನು|ಹೇಗೆ|ಏಕೆ|ಯಾವಾಗ|ಎಲ್ಲಿ)/,
    /(ಗಣಿತ|ವಿಜ್ಞಾನ|ಇತಿಹಾಸ|ಭೂಗೋಳ|ಭೌತಶಾಸ್ತ್ರ)/,
    
    // Malayalam (Malayalam script)
    /(പാഠം|പഠിക്കുക|പഠിപ്പിക്കുക|വിശദീകരിക്കുക|പഠനം|ക്വിസ്|പരീക്ഷ)/,
    /(വിഷയം|സങ്കല്പം|സിദ്ധാന്തം|ഉദാഹരണം)/,
    /(വിദ്യാഭ്യാസം|അറിവ്|കഴിവ്|പരിശീലനം)/,
    /(എന്ത്|എങ്ങനെ|എന്തുകൊണ്ട്|എപ്പോൾ|എവിടെ)/,
    /(ഗണിതം|ശാസ്ത്രം|ചരിത്രം|ഭൂമിശാസ്ത്രം|ഭൗതികം)/,
    
    // Punjabi (Gurmukhi script)
    /(ਪਾਠ|ਸਿੱਖਣਾ|ਸਿਖਾਉਣਾ|ਸਮਝਾਉਣਾ|ਅਧਿਐਨ|ਕੁਇਜ਼|ਪ੍ਰੀਖਿਆ)/,
    /(ਵਿਸ਼ਾ|ਧਾਰਨਾ|ਸਿਧਾਂਤ|ਉਦਾਹਰਨ)/,
    /(ਸਿੱਖਿਆ|ਗਿਆਨ|ਹੁਨਰ|ਸਿਖਲਾਈ)/,
    /(ਕੀ|ਕਿਵੇਂ|ਕਿਉਂ|ਕਦੋਂ|ਕਿੱਥੇ)/,
    /(ਗਣਿਤ|ਵਿਗਿਆਨ|ਇਤਿਹਾਸ|ਭੂਗੋਲ|ਭੌਤਿਕ)/,
    
    // Urdu (Arabic script)
    /(سبق|سیکھنا|سکھانا|سمجھانا|مطالعہ|کوئز|امتحان)/,
    /(موضوع|تصور|نظریہ|مثال)/,
    /(تعلیم|علم|مہارت|تربیت)/,
    /(کیا|کیسے|کیوں|کب|کہاں)/,
    /(ریاضی|سائنس|تاریخ|جغرافیہ|طبیعیات)/,
  ];

  const hasEducationalKeyword = educationalKeywords.some((pattern) =>
    pattern.test(trimmedPrompt)
  );

  if (!hasEducationalKeyword) {
    // Check if it's a topic/subject even without explicit keywords
    // Allow if it contains:
    // 1. Proper nouns (Latin or Indic scripts)
    // 2. Numbers
    // 3. At least 4 words
    // 4. Contains any Indic script characters (likely educational content in regional language)
    const hasIndicScript = /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0600-\u06FF]/.test(trimmedPrompt);
    const hasSubstantiveContent = 
      /\b[A-Z][a-z]+/.test(trimmedPrompt) || // Proper nouns (English)
      /\d+/.test(trimmedPrompt) || // Numbers
      trimmedPrompt.split(/\s+/).length >= 4 || // At least 4 words
      hasIndicScript; // Contains Indian language scripts or Arabic (Urdu)

    if (!hasSubstantiveContent) {
      return {
        isValid: false,
        error: "Please enter a valid prompt related to lessons, education, or learning topics",
      };
    }
  }

  // 11. Check for gibberish (English text only, skip for Indic scripts)
  const hasIndicScript = /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0600-\u06FF]/.test(trimmedPrompt);
  
  if (!hasIndicScript) {
    const words = trimmedPrompt.split(/\s+/);
    const hasGibberish = words.some((word) => {
      if (word.length < 4) return false;
      return /[bcdfghjklmnpqrstvwxyz]{6,}/i.test(word) || // 6+ consonants
             /[aeiou]{5,}/i.test(word); // 5+ vowels
    });

    if (hasGibberish) {
      return {
        isValid: false,
        error: "Please enter a valid prompt with real words",
      };
    }
  }

  // All checks passed
  return {
    isValid: true,
  };
}

/**
 * Get helpful suggestion based on what might be wrong with the prompt
 */
export function getPromptSuggestion(prompt: string): string {
  const trimmed = prompt.trim();

  if (trimmed.length < 10) {
    return "Try something like: 'Interactive lesson explaining how photosynthesis works' or 'Quiz on World War 2 history'";
  }

  if (!/\b(lesson|learn|teach|explain|quiz|test)\b/i.test(trimmed)) {
    return "Start your prompt with phrases like: 'Create a lesson about...', 'Quiz on...', 'Explain...', or 'Interactive tutorial on...'";
  }

  return "Make sure your prompt describes an educational topic, subject, or learning activity";
}
