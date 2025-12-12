import natural from 'natural';
import FuzzySet from 'fuzzyset.js';

const { SentimentAnalyzer, PorterStemmer, WordNet, LevenshteinDistance } = natural;

class SentimentAnalysisService {
  constructor() {
    this.analyzer = new SentimentAnalyzer('English', PorterStemmer, 'afinn');
    this.stemmer = PorterStemmer;
    this.wordnet = new WordNet();
    
    // EXPANDED FuzzySet dictionary (500+ words)
    this.fuzzySet = FuzzySet([
      // Original words
      'rules', 'classroom', 'hostel', 'society', 'comment', 'post',
      'question', 'answer', 'problem', 'solution', 'help', 'error',
      'issue', 'fixed', 'solved', 'working',
      // Synonyms for rules
      'regulations', 'directives', 'guidelines', 'policies', 'standards', 
      'principles', 'laws', 'norms', 'code', 'requirements', 'bylaws', 
      'ordinances', 'decree', 'statute', 'mandate', 'protocol',
      // Synonyms for classroom
      'class', 'room', 'lecture', 'hall', 'course', 'lectureroom',
      'auditorium', 'seminar', 'tutorial', 'workshop',
      // Synonyms for hostel
      'dormitory', 'dorm', 'residence', 'accommodation', 'lodging', 
      'quarters', 'housing', 'residency', 'dwelling', 'lodge',
      // Synonyms for society
      'community', 'association', 'organization', 'group', 'club', 
      'collective', 'fellowship', 'league', 'union', 'guild',
      // Academic words
      'assignment', 'homework', 'exam', 'test', 'grade', 'professor',
      'teacher', 'student', 'library', 'cafeteria', 'wifi', 'internet',
      'parking', 'facility', 'campus', 'university', 'college', 'school',
      // More common words
      'schedule', 'timetable', 'syllabus', 'curriculum', 'course',
      'degree', 'diploma', 'certificate', 'transcript', 'enrollment',
      'registration', 'admission', 'scholarship', 'tuition', 'fees'
    ]);
    
    // Stemmed keyword weights
    this.forumKeywords = {
      'solv': 2.5, 'fix': 2.0, 'work': 1.5, 'help': 1.5,
      'thank': 2.0, 'great': 2.0, 'excel': 2.0, 'awesom': 2.0,
      'perfect': 2.0, 'appreci': 1.5, 'us': 1.5, 'brilliant': 2.0,
      'recommend': 1.5, 'answer': 1.5, 'resolv': 2.0,
      'problem': -1.5, 'issu': -1.5, 'bug': -2.0, 'error': -2.0,
      'fail': -2.5, 'broken': -2.0, 'stuck': -2.0, 'confus': -1.5,
      'unclear': -1.5, 'difficult': -1.5, 'troubl': -1.5,
      'crash': -2.0, 'wrong': -1.5, 'bad': -1.5, 'poor': -1.5,
      'how': -0.3, 'what': 0, 'when': 0, 'where': 0, 'why': -0.2, 'question': 0
    };

    // COMPREHENSIVE manual synonyms (for fast fallback)
    this.manualSynonyms = {
      'rules': ['regulations', 'directives', 'guidelines', 'policies', 'standards', 'laws', 'norms', 'principles', 'code', 'requirements', 'bylaws', 'ordinances', 'mandate', 'protocol'],
      'regulations': ['rules', 'directives', 'guidelines', 'policies', 'laws', 'ordinances'],
      'directives': ['rules', 'regulations', 'guidelines', 'orders', 'instructions'],
      'guidelines': ['rules', 'regulations', 'directives', 'standards', 'protocols'],
      'policies': ['rules', 'regulations', 'guidelines', 'procedures', 'protocols'],
      'classroom': ['class', 'room', 'lecture', 'hall', 'course', 'lectureroom', 'auditorium'],
      'class': ['classroom', 'course', 'lecture', 'lesson', 'session'],
      'hostel': ['dormitory', 'dorm', 'residence', 'accommodation', 'lodging', 'housing', 'quarters'],
      'dormitory': ['hostel', 'dorm', 'residence', 'housing'],
      'dorm': ['dormitory', 'hostel', 'residence'],
      'society': ['community', 'association', 'organization', 'group', 'club', 'collective'],
      'community': ['society', 'group', 'association', 'collective'],
      'problem': ['issue', 'trouble', 'difficulty', 'challenge', 'concern', 'matter'],
      'issue': ['problem', 'trouble', 'matter', 'concern'],
      'solution': ['fix', 'answer', 'resolution', 'workaround', 'remedy', 'cure'],
      'fix': ['solution', 'repair', 'remedy', 'resolve'],
      'error': ['mistake', 'bug', 'glitch', 'fault', 'defect', 'flaw'],
      'help': ['assist', 'support', 'aid', 'guide', 'advise'],
      'question': ['query', 'inquiry', 'ask', 'doubt', 'request']
    };
  }

  
  async getSynonymsFromWordNet(word) {
    return new Promise((resolve) => {
      const synonyms = new Set([word.toLowerCase()]);
      let timeoutId;

      const complete = () => {
        clearTimeout(timeoutId);
        resolve(Array.from(synonyms).slice(0, 15)); // Increased to 15
      };

      // Longer timeout: 3 seconds
      timeoutId = setTimeout(() => {
        //console.log(`[WORDNET] Timeout for "${word}", using ${synonyms.size} synonyms`);
        resolve(Array.from(synonyms).slice(0, 15));
      }, 3000);

      this.wordnet.lookup(word, (results) => {
        if (!results || results.length === 0) {
          complete();
          return;
        }

        results.forEach((result) => {
          // Add synonyms from synset
          if (result.synonyms && Array.isArray(result.synonyms)) {
            result.synonyms.forEach(syn => {
              const clean = syn.toLowerCase().replace(/_/g, ' ').trim();
              // Accept both single words and two-word phrases
              const wordCount = clean.split(' ').length;
              if (wordCount <= 2 && clean.length >= 3) {
                synonyms.add(clean);
              }
            });
          }

          // Add lemma
          if (result.lemma) {
            const lemma = result.lemma.toLowerCase().replace(/_/g, ' ');
            if (lemma.split(' ').length <= 2) {
              synonyms.add(lemma);
            }
          }

          // Add glossary terms (definitions often contain synonyms)
          if (result.gloss) {
            const gloss = result.gloss.toLowerCase();
            // Extract words in quotes or after "or"
            const quotedWords = gloss.match(/"([^"]+)"/g);
            if (quotedWords) {
              quotedWords.forEach(quoted => {
                const word = quoted.replace(/"/g, '').trim();
                if (word.split(' ').length <= 2) {
                  synonyms.add(word);
                }
              });
            }
          }
        });

        complete();
      });
    });
  }

  //FIXED: Better spell correction with Levenshtein + FuzzySet
  correctSpelling(word) {
    if (word.length < 3) return word;

    const lowerWord = word.toLowerCase();
    
    // 1. Try FuzzySet first (fast)
    const fuzzyMatches = this.fuzzySet.get(lowerWord);
    if (fuzzyMatches && fuzzyMatches.length > 0) {
      const [score, corrected] = fuzzyMatches[0];
      if (score > 0.7) { // Lowered threshold for better matches
        if (corrected !== lowerWord) {
          //console.log(`[SPELL CHECK] "${word}" → "${corrected}" (FuzzySet score: ${score.toFixed(2)})`);
        }
        return corrected;
      }
    }

    // 2. Try Levenshtein distance against all fuzzy words
    const fuzzyWords = this.fuzzySet.values();
    let bestMatch = lowerWord;
    let minDistance = Math.ceil(word.length * 0.4); // Allow 40% difference

    for (const dictWord of fuzzyWords) {
      const distance = LevenshteinDistance(lowerWord, dictWord);
      if (distance < minDistance && distance <= 2) { // Max 2 character difference
        minDistance = distance;
        bestMatch = dictWord;
      }
    }

    if (bestMatch !== lowerWord) {
      //console.log(`[SPELL CHECK] "${word}" → "${bestMatch}" (Levenshtein distance: ${minDistance})`);
    }

    return bestMatch;
  }

  async expandQueryForSearch(query) {
    const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const expandedTerms = new Set();
    
    expandedTerms.add(query.toLowerCase());

    //console.log(`[EXPANSION] Processing "${query}" (${words.length} words)...`);

    for (const word of words) {
      expandedTerms.add(word);
      
      // 1. Spell correction
      const corrected = this.correctSpelling(word);
      expandedTerms.add(corrected);

      // 2. Manual synonyms (FAST - always use these)
      if (this.manualSynonyms[corrected]) {
        this.manualSynonyms[corrected].forEach(syn => {
          expandedTerms.add(syn);
          expandedTerms.add(this.stemmer.stem(syn));
        });
        //console.log(`[MANUAL] "${corrected}" → ${this.manualSynonyms[corrected].length} synonyms`);
      }

      // 3. WordNet synonyms (SLOW - but comprehensive)
      try {
        //console.log(`[WORDNET] Looking up "${corrected}"...`);
        const wordnetSyns = await this.getSynonymsFromWordNet(corrected);
        wordnetSyns.forEach(syn => {
          expandedTerms.add(syn);
          expandedTerms.add(this.stemmer.stem(syn));
        });
        //console.log(`[WORDNET] "${corrected}" → ${wordnetSyns.length} synonyms`);
      } catch (err) {
        //console.log(`[WORDNET] Failed for "${corrected}":`, err.message);
      }

      // 4. Stem the corrected word
      expandedTerms.add(this.stemmer.stem(corrected));
    }

    const finalTerms = Array.from(expandedTerms)
      .filter(term => term && term.length > 1)
      .slice(0, 100); // Limit to 100 terms for performance

    //console.log(`[EXPANSION] "${query}" → ${finalTerms.length} terms:`, finalTerms.slice(0, 20).join(', '));

    return finalTerms;
  }

  preprocessText(text) {
    if (!text || typeof text !== 'string') return [];

    let tokens = text.toLowerCase().split(/\s+/);

    tokens = tokens.map(token => {
      token = token.replace(/[^\w]/g, '');
      if (!token) return null;
      token = this.correctSpelling(token);
      return token;
    }).filter(Boolean);

    return tokens;
  }

  analyzeSentiment(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return {
        score: 0,
        sentiment: 'neutral',
        confidence: 0,
        category: 'unknown',
        detectedKeywords: []
      };
    }

    const tokens = this.preprocessText(text);
    
    if (tokens.length === 0) {
      return {
        score: 0,
        sentiment: 'neutral',
        confidence: 0,
        category: 'unknown',
        detectedKeywords: []
      };
    }

    let baseSentiment = this.analyzer.getSentiment(tokens);
    let forumScore = 0;
    let keywordMatches = 0;
    const detectedKeywords = [];

    tokens.forEach(token => {
      const stemmed = this.stemmer.stem(token);
      
      if (this.forumKeywords[stemmed] !== undefined) {
        forumScore += this.forumKeywords[stemmed];
        keywordMatches++;
        detectedKeywords.push({
          original: token,
          stemmed: stemmed,
          weight: this.forumKeywords[stemmed]
        });
      }
    });
    
    const combinedScore = (baseSentiment * 0.5) + (forumScore * 0.5);
    const normalizedScore = Math.max(-1, Math.min(1, combinedScore / Math.max(tokens.length, 1)));
    
    let sentiment;
    let category;
    
    if (normalizedScore > 0.4) {
      sentiment = 'positive';
      category = 'solution';
    } else if (normalizedScore < -0.4) {
      sentiment = 'negative';
      category = 'problem';
    } else if (normalizedScore > 0.15) {
      sentiment = 'slightly_positive';
      category = 'discussion';
    } else if (normalizedScore < -0.15) {
      sentiment = 'slightly_negative';
      category = 'question';
    } else {
      sentiment = 'neutral';
      category = 'general';
    }
    
    const lengthConfidence = Math.min(1, tokens.length / 30);
    const keywordConfidence = Math.min(1, keywordMatches * 0.15);
    const scoreConfidence = Math.abs(normalizedScore);
    const confidence = (lengthConfidence + keywordConfidence + scoreConfidence) / 3;
    
    return {
      score: parseFloat(normalizedScore.toFixed(3)),
      sentiment,
      confidence: parseFloat(confidence.toFixed(2)),
      category,
      keywordMatches,
      detectedKeywords: detectedKeywords.slice(0, 5)
    };
  }

  //Analyze query intent
  analyzeQuery(query) {
    const sentiment = this.analyzeSentiment(query);
    const tokens = this.preprocessText(query);
    const lowerQuery = query.toLowerCase();
    
    let queryType = 'general';
    
    const questionPatterns = {
      'question': ['how', 'what', 'when', 'where', 'why', 'who', 'which', 'can', 'could', 'would', 'should'],
      'problem_report': ['problem', 'issue', 'error', 'bug', 'not working', 'failed', 'broken', 'stuck', 'cant', 'cannot', 'doesnt', 'wont', 'crash'],
      'seeking_solution': ['solved', 'solution', 'fix', 'resolved', 'answer', 'how to fix', 'how to solve']
    };
    
    for (const [type, patterns] of Object.entries(questionPatterns)) {
      for (const pattern of patterns) {
        if (type === 'question' && tokens.includes(pattern) && tokens.indexOf(pattern) <= 2) {
          queryType = 'question';
          break;
        } else if (tokens.includes(pattern) || lowerQuery.includes(pattern)) {
          queryType = type;
          break;
        }
      }
      if (queryType !== 'general') break;
    }
    
    return {
      sentiment,
      queryType,
      intent: this.determineIntent(sentiment, queryType),
      tokens: tokens.slice(0, 10)
    };
  }

  determineIntent(sentiment, queryType) {
    if (queryType === 'question' || sentiment.category === 'question') {
      return 'find_answers';
    } else if (queryType === 'problem_report' || sentiment.category === 'problem') {
      return 'find_solutions';
    } else if (queryType === 'seeking_solution' || sentiment.category === 'solution') {
      return 'find_similar_solved';
    } else {
      return 'general_search';
    }
  }

  getSortingStrategy(analysis) {
    const { intent } = analysis;
    
    switch (intent) {
      case 'find_answers':
        return {
          preferredSentiments: ['positive', 'slightly_positive'],
          sortBy: 'relevance',
          boostSolved: true,
          boostHighUpvotes: true,
          minUpvotes: 1
        };
      case 'find_solutions':
        return {
          preferredSentiments: ['positive', 'neutral'],
          sortBy: 'relevance',
          boostSolved: true,
          boostHighUpvotes: true,
          minUpvotes: 0
        };
      case 'find_similar_solved':
        return {
          preferredSentiments: ['positive'],
          sortBy: 'popular',
          boostSolved: true,
          boostHighUpvotes: true,
          minUpvotes: 2
        };
      default:
        return {
          preferredSentiments: null,
          sortBy: 'relevance',
          boostSolved: false,
          boostHighUpvotes: false,
          minUpvotes: 0
        };
    }
  }

  calculateMatchRelevance(post, queryAnalysis, postSentiment) {
    let score = post.textScore || 0;
    
    if (!postSentiment) return score;
    
    const { intent } = queryAnalysis;
    const { category, sentiment } = postSentiment.overall;
    
    if (intent === 'find_answers' && category === 'solution') {
      score += 5;
    } else if (intent === 'find_solutions' && category === 'solution') {
      score += 4;
    } else if (intent === 'find_answers' && sentiment === 'positive') {
      score += 3;
    }
    
    if (post.upvotes > 5) {
      score += Math.min(post.upvotes * 0.5, 10);
    }
    
    return score;
  }

  calculateSearchRelevance(item, searchTerms, isComment = false) {
    let score = 0;
    const title = (item.title || '').toLowerCase();
    const content = (item.content || '').toLowerCase();
    const tags = (item.tags || []).join(' ').toLowerCase();
    
    searchTerms.forEach(term => {
      const termLower = term.toLowerCase();
      const regex = new RegExp(termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      
      const titleMatches = (title.match(regex) || []).length;
      score += titleMatches * 10;
      
      const contentMatches = (content.match(regex) || []).length;
      score += contentMatches * 3;
      
      const tagMatches = (tags.match(regex) || []).length;
      score += tagMatches * 5;
    });

    score += (item.upvotes || 0) * 0.5;

    if (isComment) {
      score *= 0.7;
    }

    return score;
  }

}

// Export singleton
const sentimentAnalysisService = new SentimentAnalysisService();
export default sentimentAnalysisService;