import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { tokens } from './src/styles/tokens';

type AgeCategory = 'under18' | '18-25' | '25-30' | '30-35' | '40+';
type Region = 'Tropical' | 'Dry' | 'Temperate' | 'Continental' | 'Polar';
type AQI = 'Good' | 'Moderate' | 'Unhealthy-Sensitive' | 'Unhealthy' | 'Very-Unhealthy' | 'Hazardous';
type SkinType = 'Dry' | 'Oily' | 'Normal' | 'Combination' | 'Sensitive';
type Concern = 'Acne' | 'Pigmentation' | 'Oiliness' | 'Sensitivity' | 'Irritation' | 'None' | 'Others';
type Lifestyle = 'Irregular Sleep' | 'High Screen Time' | 'Not So Active' | 'Custom';

interface FormData {
  age?: AgeCategory;
  region?: Region;
  aqi?: AQI;
  skinType?: SkinType;
  concerns: Concern[];
  concernsOther?: string;
  lifestyle: Lifestyle[];
  lifestyleCustom?: string;
}

interface AnalysisResult {
  routine: string[];
  products: string[];
  nutrients: string[];
  precautions: string[];
}

interface HistoryItem {
  id: string;
  timestamp: number;
  formData: FormData;
  result: AnalysisResult;
}

interface QAMessage {
  id: string;
  type: 'user' | 'assistant';
  text: string;
}

function DotGrid({ isDark }: { isDark: boolean }) {
  const dotColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const dots = [];
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 26; x++) {
      dots.push(
        <View
          key={`${x}-${y}`}
          style={{
            position: 'absolute',
            left: x * 14,
            top: y * 14,
            width: 1.5,
            height: 1.5,
            backgroundColor: dotColor,
            borderRadius: 0.75,
          }}
        />
      );
    }
  }
  return <View style={StyleSheet.absoluteFill}>{dots}</View>;
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [currentView, setCurrentView] = useState<'form' | 'results' | 'history' | 'qa'>('form');
  const [formData, setFormData] = useState<FormData>({
    concerns: [],
    lifestyle: [],
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [editMode, setEditMode] = useState<{
    routine?: boolean;
    products?: boolean;
    nutrients?: boolean;
    precautions?: boolean;
  }>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [qaMessages, setQAMessages] = useState<QAMessage[]>([]);
  const [qaInput, setQAInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const loadingAnim = useRef(new Animated.Value(0)).current;
  const thinkingAnim = useRef(new Animated.Value(0)).current;
  const [loadingText, setLoadingText] = useState('Analyzing');
  const [thinkingText, setThinkingText] = useState('Thinking');

  const bg = isDark ? tokens.colors.dark : tokens.colors.light;
  const fg = isDark ? tokens.colors.light : tokens.colors.dark;
  const secondary = isDark ? tokens.colors['secondary-dark'] : tokens.colors['secondary-light'];

  const isFormValid = () => {
    return formData.age && formData.skinType && formData.concerns.length > 0;
  };

  const resetToForm = () => {
    setFormData({
      concerns: [],
      lifestyle: [],
    });
    setResult(null);
    setEditMode({});
    setQAMessages([]);
    setCurrentView('form');
  };

  const runAnalysis = async () => {
    if (!isFormValid()) return;
    setIsAnalyzing(true);
    setCurrentView('results');

    const texts = ['Analyzing', 'Processing', 'Generating'];
    let textIndex = 0;
    const textInterval = setInterval(() => {
      textIndex = (textIndex + 1) % texts.length;
      setLoadingText(texts[textIndex]);
    }, 800);

    Animated.loop(
      Animated.sequence([
        Animated.timing(loadingAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(loadingAnim, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ])
    ).start();

    await new Promise(resolve => setTimeout(resolve, 3500));

    clearInterval(textInterval);
    loadingAnim.stopAnimation();
    loadingAnim.setValue(0);

    const concerns = formData.concerns.join(', ');
    const newResult: AnalysisResult = {
      routine: [
        `Week 1-2: Gentle ${formData.skinType?.toLowerCase()} skin cleansing`,
        `Week 2-3: Hydrating serum for ${concerns}`,
        `Week 3-4: Targeted ${formData.age} treatment`,
        `Week 4: Complete routine with SPF`,
      ],
      products: [
        `${formData.skinType} cleanser`,
        'Hyaluronic acid serum',
        'Lightweight moisturizer',
        'SPF 50 sunscreen',
      ],
      nutrients: [
        'Vitamin C (brightening)',
        'Vitamin E (protection)',
        'Omega-3 (skin health)',
        'Zinc (healing)',
      ],
      precautions: [
        'Patch test new products',
        'Use sunscreen daily',
        'Stay hydrated (8+ glasses)',
        'Consult dermatologist if severe',
      ],
    };

    setResult(newResult);
    setIsAnalyzing(false);
  };

  const saveToHistory = () => {
    if (!result) return;
    const item: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      formData: { ...formData },
      result: { ...result },
    };
    setHistory([item, ...history]);
  };

  const restoreHistory = (item: HistoryItem) => {
    setFormData(item.formData);
    setResult(item.result);
    setCurrentView('results');
  };

  const analyzeQuestionIntent = (question: string): string => {
    const q = question.toLowerCase();
    
    if (q.includes('when') || q.includes('time') || q.includes('how long') || q.includes('frequency')) return 'timing';
    if (q.includes('product') || q.includes('brand') || q.includes('recommend')) return 'products';
    if (q.includes('routine') || q.includes('step') || q.includes('order')) return 'routine';
    if (q.includes('why') || q.includes('cause') || q.includes('reason')) return 'explanation';
    if (q.includes('diet') || q.includes('food') || q.includes('eat') || q.includes('nutrient')) return 'nutrition';
    if (q.includes('sunscreen') || q.includes('spf') || q.includes('sun')) return 'sunprotection';
    if (q.includes('acne') || q.includes('pimple') || q.includes('breakout')) return 'acne';
    if (q.includes('dry') || q.includes('hydrat') || q.includes('moisture')) return 'hydration';
    if (q.includes('age') || q.includes('wrinkle') || q.includes('aging')) return 'aging';
    if (q.includes('sensitive') || q.includes('irritat') || q.includes('react')) return 'sensitivity';
    if (q.includes('pigment') || q.includes('dark spot') || q.includes('brighten')) return 'pigmentation';
    
    return 'general';
  };

  const generateContextAwareResponse = (question: string, intent: string, previousQuestions: QAMessage[]): string => {
    const profile = formData;
    const skinType = profile.skinType || 'your skin type';
    const age = profile.age || 'your age group';
    const concerns = profile.concerns.length > 0 ? profile.concerns.join(', ').toLowerCase() : 'your concerns';
    const region = profile.region || 'your climate';
    const aqi = profile.aqi || 'your air quality';
    
    const isFollowUp = previousQuestions.length > 0;
    const lastUserQuestion = previousQuestions.filter(m => m.type === 'user').slice(-1)[0]?.text || '';
    
    switch (intent) {
      case 'timing':
        return `For your ${skinType} skin with ${concerns}, I recommend: Morning routine (7-8 AM) - cleanse, serum, moisturizer, SPF. Evening routine (9-10 PM) - double cleanse, treatment, night cream. Allow 30-60 seconds between each step for absorption. In ${region} climate, consider adjusting timing based on humidity levels.`;
      
      case 'products':
        if (skinType === 'Oily') {
          return `For oily skin in ${region} climate: Look for gel-based cleansers with salicylic acid (2%), oil-free hyaluronic acid serums, lightweight gel moisturizers with niacinamide (5-10%), and mattifying SPF 50+ sunscreens. Avoid heavy creams and comedogenic oils. Key ingredient: Niacinamide helps regulate sebum production.`;
        } else if (skinType === 'Dry') {
          return `For dry skin in ${region} climate: Use cream-based cleansers (avoid sulfates), hyaluronic acid + ceramide serums, rich moisturizers with shea butter or squalane, and hydrating SPF 50+ sunscreens. Layer products from thinnest to thickest consistency. In dry climates, consider adding a facial oil as the last step.`;
        } else if (skinType === 'Sensitive') {
          return `For sensitive skin: Choose fragrance-free, hypoallergenic products. Gentle milk cleansers, centella asiatica serums, ceramide-rich moisturizers, mineral SPF 50+ (zinc oxide/titanium dioxide). Patch test everything for 48 hours. Avoid: alcohol, essential oils, harsh acids initially.`;
        } else if (skinType === 'Combination') {
          return `For combination skin: Gel cleansers for balanced cleansing, lightweight serums (hyaluronic acid + niacinamide), gel-cream moisturizers, and broad-spectrum SPF 50+. Multi-mask technique: clay mask on T-zone, hydrating mask on cheeks (1-2x weekly).`;
        }
        return `For ${skinType} skin with ${concerns}: Focus on gentle, pH-balanced cleansers, hydrating serums with proven ingredients, appropriate moisturizers for your skin type, and broad-spectrum SPF 50+ sunscreen. Always patch test new products.`;
      
      case 'routine':
        return `Your personalized ${age} routine for ${skinType} skin: AM - 1) Gentle cleanser 2) Antioxidant serum (Vitamin C) 3) Moisturizer 4) SPF 50+. PM - 1) Oil cleanser (if wearing makeup/SPF) 2) Water-based cleanser 3) Treatment serum (for ${concerns}) 4) Night cream. Exfoliate 2-3x weekly (chemical exfoliants for ${skinType} skin). ${isFollowUp ? 'This builds on the earlier recommendation with specific product categories.' : ''}`;
      
      case 'explanation':
        if (question.toLowerCase().includes('sunscreen')) {
          return `Sunscreen is crucial for ${age} skin because: 1) UV damage causes 80% of visible aging (photoaging), 2) prevents hyperpigmentation, especially in ${region} climate, 3) protects against skin cancer risk. For ${skinType} skin, mineral sunscreens (zinc oxide) are gentler, while chemical filters (avobenzone) work well for oily skin. Reapply every 2 hours in sun exposure.`;
        }
        if (question.toLowerCase().includes('vitamin c')) {
          return `Vitamin C for ${skinType} skin: It's a powerful antioxidant that neutralizes free radicals from pollution (important with ${aqi} AQI), boosts collagen production (crucial for ${age}), and brightens hyperpigmentation. Use 10-20% L-ascorbic acid serum in AM before SPF. Store in dark, cool place to prevent oxidation.`;
        }
        return `For your ${concerns}: These issues are often caused by a combination of factors including genetics, environmental stress (${region} climate, ${aqi} AQI), hormones (especially in ${age} group), and lifestyle factors. Addressing them requires consistent skincare routine, proper hydration, balanced diet, and sometimes professional dermatological intervention.`;
      
      case 'nutrition':
        return `Nutrition for ${skinType} skin and ${concerns}: 1) Omega-3 fatty acids (salmon, walnuts) - reduce inflammation, 2) Vitamin C (citrus, berries) - collagen synthesis, 3) Vitamin E (almonds, avocado) - protection, 4) Zinc (pumpkin seeds) - healing and oil regulation, 5) Biotin (eggs) - skin health. Hydrate with 8-10 glasses water daily. In ${region} climate, adjust water intake accordingly.`;
      
      case 'sunprotection':
        return `SPF guidance for ${region} climate and ${skinType} skin: Use broad-spectrum SPF 50+ daily (even indoors - UVA penetrates windows). Amount: 1/4 teaspoon for face. Reapply every 2 hours in sun. Mineral sunscreens (zinc oxide, titanium dioxide) for sensitive skin; chemical filters for oily skin. In high AQI (${aqi}), use antioxidant serum under SPF for added protection.`;
      
      case 'acne':
        return `Acne treatment for ${skinType} skin at ${age}: 1) Salicylic acid (2%) cleanser - unclogs pores, 2) Niacinamide serum (5-10%) - reduces inflammation, 3) Benzoyl peroxide spot treatment (2.5-5%) - kills bacteria, 4) Oil-free moisturizer, 5) Non-comedogenic SPF. Avoid: over-cleansing, picking, heavy oils. In ${region} climate with ${aqi} AQI, cleanse twice daily to remove pollution.`;
      
      case 'hydration':
        return `Hydration strategy for ${skinType} skin in ${region} climate: 1) Hyaluronic acid serum (holds 1000x its weight in water), 2) Ceramide moisturizer (repairs skin barrier), 3) Humectant-rich products (glycerin), 4) Occlusive layer at night (squalane oil). Drink 8-10 glasses water. Use humidifier if air is dry. For ${age}, barrier repair becomes increasingly important.`;
      
      case 'aging':
        return `Anti-aging for ${age} with ${skinType} skin: 1) Retinol/Retinoid (start 0.25-0.5%, increase gradually) - stimulates collagen, 2) Peptide serums - skin firming, 3) Antioxidants (Vitamin C, E, Ferulic Acid), 4) Broad-spectrum SPF 50+ (most important!), 5) Hyaluronic acid - plumping. Consistency is key. Results typically visible after 12 weeks. In ${region} climate, adjust retinol frequency to avoid irritation.`;
      
      case 'sensitivity':
        return `Managing sensitive skin (${skinType}): 1) Minimal routine (less is more), 2) Fragrance-free, hypoallergenic products, 3) Centella asiatica (cica) - calming, 4) Ceramides - barrier repair, 5) Mineral SPF only. Avoid: alcohol, essential oils, harsh acids, hot water. Patch test 48 hours before full application. With ${aqi} AQI, cleanse gently to remove pollutants without stripping skin.`;
      
      case 'pigmentation':
        return `Treating pigmentation for ${skinType} skin: 1) Vitamin C serum (10-20% L-ascorbic acid) - brightening, 2) Niacinamide (5-10%) - inhibits melanin transfer, 3) Alpha arbutin (2%) - tyrosinase inhibitor, 4) Gentle AHA exfoliation (lactic/mandelic acid 5-10%) 2-3x weekly, 5) SPF 50+ PA++++ (crucial!). Avoid: hydroquinone without dermatologist. Results take 8-12 weeks. Sun protection is non-negotiable.`;
      
      default:
        if (isFollowUp) {
          return `Building on your previous question about "${lastUserQuestion.substring(0, 30)}...": For your ${skinType} skin at ${age} with ${concerns}, maintaining consistency is essential. Every skin is unique, so monitor how your skin responds and adjust accordingly. If you experience persistent issues, consult a dermatologist for personalized medical advice tailored to ${region} climate and ${aqi} AQI conditions.`;
        }
        return `For your ${skinType} skin profile at ${age} with concerns about ${concerns}: A holistic approach works best - combine proper skincare routine, balanced nutrition, adequate sleep (7-9 hours), stress management, and sun protection. In ${region} climate with ${aqi} AQI, focus on antioxidant protection and gentle cleansing. Remember, skincare is a journey, not a quick fix. Consistency over 8-12 weeks shows results.`;
    }
  };

  const sendQAMessage = () => {
    if (!qaInput.trim()) return;
    
    const userMsg: QAMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: qaInput,
    };
    
    setQAMessages(prev => [...prev, userMsg]);
    setQAInput('');
    setIsThinking(true);

    const thinkingTexts = ['Thinking', 'Processing', 'Analyzing'];
    let textIndex = 0;
    const textInterval = setInterval(() => {
      textIndex = (textIndex + 1) % thinkingTexts.length;
      setThinkingText(thinkingTexts[textIndex]);
    }, 700);

    Animated.loop(
      Animated.sequence([
        Animated.timing(thinkingAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(thinkingAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();

    setTimeout(() => {
      clearInterval(textInterval);
      thinkingAnim.stopAnimation();
      thinkingAnim.setValue(0);

      const intent = analyzeQuestionIntent(userMsg.text);
      const response = generateContextAwareResponse(userMsg.text, intent, qaMessages);
      
      const assistantMsg: QAMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        text: response,
      };
      setQAMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);
    }, 2500);
  };

  const toggleConcern = (concern: Concern) => {
    if (formData.concerns.includes(concern)) {
      setFormData({ ...formData, concerns: formData.concerns.filter(c => c !== concern) });
    } else {
      setFormData({ ...formData, concerns: [...formData.concerns, concern] });
    }
  };

  const toggleLifestyle = (lifestyle: Lifestyle) => {
    if (formData.lifestyle.includes(lifestyle)) {
      setFormData({ ...formData, lifestyle: formData.lifestyle.filter(l => l !== lifestyle) });
    } else {
      setFormData({ ...formData, lifestyle: [...formData.lifestyle, lifestyle] });
    }
  };

  const updateEditedItem = (section: keyof AnalysisResult, index: number, value: string) => {
    if (!result) return;
    const newResult = { ...result };
    newResult[section][index] = value;
    setResult(newResult);
  };

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <DotGrid isDark={isDark} />

      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <View style={styles.topBarRight}>
          {currentView === 'history' && (
            <TouchableOpacity
              onPress={() => setCurrentView(result ? 'results' : 'form')}
              style={styles.iconButton}
            >
              <MaterialIcons name="arrow-back" size={18} color={fg} />
            </TouchableOpacity>
          )}
          {(currentView === 'results' || currentView === 'qa') && (
            <TouchableOpacity
              onPress={resetToForm}
              style={styles.iconButton}
            >
              <MaterialIcons name="refresh" size={18} color={fg} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {}}
            style={styles.iconButton}
          >
            <MaterialIcons name="track-changes" size={18} color={fg} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setCurrentView(currentView === 'history' ? (result ? 'results' : 'form') : 'history')}
            style={styles.iconButton}
          >
            <MaterialIcons name="history" size={18} color={fg} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsDark(!isDark)} style={styles.iconButton}>
            <MaterialIcons name={isDark ? 'wb-sunny' : 'nights-stay'} size={18} color={fg} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}>
        {currentView === 'form' && (
          <View style={styles.formContainer}>
            <Text style={[styles.sectionTitle, { color: fg }]} numberOfLines={1}>
              Skincare Analysis
            </Text>

            <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
              Age *
            </Text>
            <View style={styles.optionRow}>
              {(['under18', '18-25', '25-30', '30-35', '40+'] as AgeCategory[]).map(age => (
                <TouchableOpacity
                  key={age}
                  onPress={() => setFormData({ ...formData, age })}
                  style={[
                    styles.chip,
                    { borderColor: fg },
                    formData.age === age && { backgroundColor: isDark ? tokens.colors.light : tokens.colors.dark },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: formData.age === age ? (isDark ? tokens.colors.dark : tokens.colors.light) : fg },
                    ]}
                    numberOfLines={1}
                  >
                    {age}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
              Region
            </Text>
            <View style={styles.optionRow}>
              {(['Tropical', 'Dry', 'Temperate', 'Continental', 'Polar'] as Region[]).map(region => (
                <TouchableOpacity
                  key={region}
                  onPress={() => setFormData({ ...formData, region })}
                  style={[
                    styles.chip,
                    { borderColor: fg },
                    formData.region === region && { backgroundColor: isDark ? tokens.colors.light : tokens.colors.dark },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: formData.region === region ? (isDark ? tokens.colors.dark : tokens.colors.light) : fg },
                    ]}
                    numberOfLines={1}
                  >
                    {region}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
              AQI
            </Text>
            <View style={styles.optionRow}>
              {(['Good', 'Moderate', 'Unhealthy-Sensitive', 'Unhealthy', 'Very-Unhealthy', 'Hazardous'] as AQI[]).slice(0, 3).map(aqi => (
                <TouchableOpacity
                  key={aqi}
                  onPress={() => setFormData({ ...formData, aqi })}
                  style={[
                    styles.chip,
                    { borderColor: fg },
                    formData.aqi === aqi && { backgroundColor: isDark ? tokens.colors.light : tokens.colors.dark },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: formData.aqi === aqi ? (isDark ? tokens.colors.dark : tokens.colors.light) : fg },
                    ]}
                    numberOfLines={1}
                  >
                    {aqi}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.optionRow}>
              {(['Unhealthy', 'Very-Unhealthy', 'Hazardous'] as AQI[]).map(aqi => (
                <TouchableOpacity
                  key={aqi}
                  onPress={() => setFormData({ ...formData, aqi })}
                  style={[
                    styles.chip,
                    { borderColor: fg },
                    formData.aqi === aqi && { backgroundColor: isDark ? tokens.colors.light : tokens.colors.dark },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: formData.aqi === aqi ? (isDark ? tokens.colors.dark : tokens.colors.light) : fg },
                    ]}
                    numberOfLines={1}
                  >
                    {aqi}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
              Skin Type *
            </Text>
            <View style={styles.optionRow}>
              {(['Dry', 'Oily', 'Normal', 'Combination', 'Sensitive'] as SkinType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setFormData({ ...formData, skinType: type })}
                  style={[
                    styles.chip,
                    { borderColor: fg },
                    formData.skinType === type && { backgroundColor: isDark ? tokens.colors.light : tokens.colors.dark },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: formData.skinType === type ? (isDark ? tokens.colors.dark : tokens.colors.light) : fg },
                    ]}
                    numberOfLines={1}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
              Primary Concerns *
            </Text>
            <View style={styles.optionRow}>
              {(['Acne', 'Pigmentation', 'Oiliness'] as Concern[]).map(concern => (
                <TouchableOpacity
                  key={concern}
                  onPress={() => toggleConcern(concern)}
                  style={[
                    styles.chip,
                    { borderColor: fg },
                    formData.concerns.includes(concern) && { backgroundColor: isDark ? tokens.colors.light : tokens.colors.dark },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: formData.concerns.includes(concern) ? (isDark ? tokens.colors.dark : tokens.colors.light) : fg },
                    ]}
                    numberOfLines={1}
                  >
                    {concern}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.optionRow}>
              {(['Sensitivity', 'Irritation', 'None'] as Concern[]).map(concern => (
                <TouchableOpacity
                  key={concern}
                  onPress={() => toggleConcern(concern)}
                  style={[
                    styles.chip,
                    { borderColor: fg },
                    formData.concerns.includes(concern) && { backgroundColor: isDark ? tokens.colors.light : tokens.colors.dark },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: formData.concerns.includes(concern) ? (isDark ? tokens.colors.dark : tokens.colors.light) : fg },
                    ]}
                    numberOfLines={1}
                  >
                    {concern}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
              Lifestyle
            </Text>
            <View style={styles.optionRow}>
              {(['Irregular Sleep', 'High Screen Time', 'Not So Active', 'Custom'] as Lifestyle[]).map(lifestyle => (
                <TouchableOpacity
                  key={lifestyle}
                  onPress={() => toggleLifestyle(lifestyle)}
                  style={[
                    styles.chip,
                    { borderColor: fg },
                    formData.lifestyle.includes(lifestyle) && { backgroundColor: isDark ? tokens.colors.light : tokens.colors.dark },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: formData.lifestyle.includes(lifestyle) ? (isDark ? tokens.colors.dark : tokens.colors.light) : fg },
                    ]}
                    numberOfLines={1}
                  >
                    {lifestyle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {formData.lifestyle.includes('Custom') && (
              <TextInput
                value={formData.lifestyleCustom || ''}
                onChangeText={text => setFormData({ ...formData, lifestyleCustom: text })}
                placeholder="Describe custom lifestyle factor..."
                placeholderTextColor={secondary}
                style={[styles.textInput, { color: fg, borderColor: fg }]}
                numberOfLines={1}
              />
            )}

            <TouchableOpacity
              onPress={runAnalysis}
              disabled={!isFormValid()}
              style={[
                styles.analyzeButton,
                { backgroundColor: isFormValid() ? tokens.colors.red : secondary },
              ]}
            >
              <Text style={[styles.analyzeButtonText, { color: tokens.colors.light }]} numberOfLines={1}>
                ANALYZE
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {currentView === 'results' && (
          <View style={styles.resultsContainer}>
            {isAnalyzing ? (
              <View style={styles.loadingContainer}>
                <Animated.View
                  style={{
                    opacity: loadingAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  }}
                >
                  <Text style={[styles.loadingText, { color: fg }]} numberOfLines={1}>
                    {loadingText}...
                  </Text>
                </Animated.View>
              </View>
            ) : result ? (
              <View>
                <Text style={[styles.profileHeader, { color: fg }]} numberOfLines={1}>
                  Skincare Profile
                </Text>

                <View style={styles.glassContainer}>
                  <BlurView intensity={isDark ? 20 : 10} tint={isDark ? 'dark' : 'light'} style={styles.glassBlur}>
                    <View style={[styles.glassContent, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.resultSectionTitle, { color: fg }]} numberOfLines={1}>
                          4-Week Routine
                        </Text>
                        <TouchableOpacity onPress={() => setEditMode({ ...editMode, routine: !editMode.routine })}>
                          <MaterialIcons name={editMode.routine ? 'check' : 'edit'} size={16} color={fg} />
                        </TouchableOpacity>
                      </View>
                      {result.routine.map((item, idx) => (
                        <View key={idx} style={styles.listItem}>
                          {editMode.routine ? (
                            <TextInput
                              value={item}
                              onChangeText={text => updateEditedItem('routine', idx, text)}
                              style={[styles.editInput, { color: fg, borderColor: fg }]}
                              numberOfLines={1}
                            />
                          ) : (
                            <Text style={[styles.listItemText, { color: fg }]} numberOfLines={2}>
                              • {item}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </BlurView>
                </View>

                <View style={styles.glassContainer}>
                  <BlurView intensity={isDark ? 20 : 10} tint={isDark ? 'dark' : 'light'} style={styles.glassBlur}>
                    <View style={[styles.glassContent, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.resultSectionTitle, { color: fg }]} numberOfLines={1}>
                          Products
                        </Text>
                        <TouchableOpacity onPress={() => setEditMode({ ...editMode, products: !editMode.products })}>
                          <MaterialIcons name={editMode.products ? 'check' : 'edit'} size={16} color={fg} />
                        </TouchableOpacity>
                      </View>
                      {result.products.map((item, idx) => (
                        <View key={idx} style={styles.listItem}>
                          {editMode.products ? (
                            <TextInput
                              value={item}
                              onChangeText={text => updateEditedItem('products', idx, text)}
                              style={[styles.editInput, { color: fg, borderColor: fg }]}
                              numberOfLines={1}
                            />
                          ) : (
                            <Text style={[styles.listItemText, { color: fg }]} numberOfLines={1}>
                              • {item}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </BlurView>
                </View>

                <View style={styles.glassContainer}>
                  <BlurView intensity={isDark ? 20 : 10} tint={isDark ? 'dark' : 'light'} style={styles.glassBlur}>
                    <View style={[styles.glassContent, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.resultSectionTitle, { color: fg }]} numberOfLines={1}>
                          Nutrients
                        </Text>
                        <TouchableOpacity onPress={() => setEditMode({ ...editMode, nutrients: !editMode.nutrients })}>
                          <MaterialIcons name={editMode.nutrients ? 'check' : 'edit'} size={16} color={fg} />
                        </TouchableOpacity>
                      </View>
                      {result.nutrients.map((item, idx) => (
                        <View key={idx} style={styles.listItem}>
                          {editMode.nutrients ? (
                            <TextInput
                              value={item}
                              onChangeText={text => updateEditedItem('nutrients', idx, text)}
                              style={[styles.editInput, { color: fg, borderColor: fg }]}
                              numberOfLines={1}
                            />
                          ) : (
                            <Text style={[styles.listItemText, { color: fg }]} numberOfLines={1}>
                              • {item}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </BlurView>
                </View>

                <View style={styles.glassContainer}>
                  <BlurView intensity={isDark ? 20 : 10} tint={isDark ? 'dark' : 'light'} style={styles.glassBlur}>
                    <View style={[styles.glassContent, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.resultSectionTitle, { color: fg }]} numberOfLines={1}>
                          Precautions
                        </Text>
                        <TouchableOpacity onPress={() => setEditMode({ ...editMode, precautions: !editMode.precautions })}>
                          <MaterialIcons name={editMode.precautions ? 'check' : 'edit'} size={16} color={fg} />
                        </TouchableOpacity>
                      </View>
                      {result.precautions.map((item, idx) => (
                        <View key={idx} style={styles.listItem}>
                          {editMode.precautions ? (
                            <TextInput
                              value={item}
                              onChangeText={text => updateEditedItem('precautions', idx, text)}
                              style={[styles.editInput, { color: fg, borderColor: fg }]}
                              numberOfLines={1}
                            />
                          ) : (
                            <Text style={[styles.listItemText, { color: fg }]} numberOfLines={1}>
                              • {item}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </BlurView>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity onPress={saveToHistory} style={[styles.actionButton, { backgroundColor: isDark ? tokens.colors.light : tokens.colors.dark }]}>
                    <Text style={[styles.actionButtonText, { color: isDark ? tokens.colors.dark : tokens.colors.light }]} numberOfLines={1}>
                      Save
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCurrentView('qa')}
                    style={[styles.actionButton, { backgroundColor: tokens.colors.red }]}
                  >
                    <Text style={[styles.actionButtonText, { color: tokens.colors.light }]} numberOfLines={1}>
                      Q&A
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {currentView === 'history' && (
          <View style={styles.historyContainer}>
            <Text style={[styles.sectionTitle, { color: fg }]} numberOfLines={1}>
              History
            </Text>
            {history.length === 0 ? (
              <Text style={[styles.emptyText, { color: fg }]} numberOfLines={2}>
                No saved analyses yet
              </Text>
            ) : (
              history.map(item => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => restoreHistory(item)}
                  style={[styles.historyItem, { borderColor: fg }]}
                >
                  <Text style={[styles.historyItemTitle, { color: fg }]} numberOfLines={1}>
                    {item.formData.skinType} - {item.formData.age}
                  </Text>
                  <Text style={[styles.historyItemDate, { color: secondary }]} numberOfLines={1}>
                    {new Date(item.timestamp).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {currentView === 'qa' && (
          <View style={styles.qaContainer}>
            <View style={styles.qaHeader}>
              <TouchableOpacity onPress={() => setCurrentView('results')} style={styles.iconButton}>
                <MaterialIcons name="arrow-back" size={18} color={fg} />
              </TouchableOpacity>
              <Text style={[styles.sectionTitle, { color: fg, flex: 1 }]} numberOfLines={1}>
                Q&A
              </Text>
            </View>

            <ScrollView style={styles.qaMessages}>
              {qaMessages.map(msg => (
                <View
                  key={msg.id}
                  style={[
                    styles.qaMessage,
                    msg.type === 'user'
                      ? { alignSelf: 'flex-end', backgroundColor: isDark ? tokens.colors.light : tokens.colors.dark }
                      : { alignSelf: 'flex-start', backgroundColor: secondary },
                  ]}
                >
                  <Text
                    style={[
                      styles.qaMessageText,
                      { color: msg.type === 'user' ? (isDark ? tokens.colors.dark : tokens.colors.light) : fg },
                    ]}
                    numberOfLines={10}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}
              {isThinking && (
                <View style={[styles.qaMessage, { alignSelf: 'flex-start', backgroundColor: secondary }]}>
                  <Animated.View
                    style={{
                      opacity: thinkingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      }),
                    }}
                  >
                    <Text style={[styles.qaMessageText, { color: fg }]} numberOfLines={1}>
                      {thinkingText}...
                    </Text>
                  </Animated.View>
                </View>
              )}
            </ScrollView>

            <View style={styles.qaInputContainer}>
              <TextInput
                value={qaInput}
                onChangeText={setQAInput}
                placeholder="Ask a question..."
                placeholderTextColor={secondary}
                style={[styles.qaInput, { color: fg, borderColor: fg }]}
              />
              <TouchableOpacity onPress={sendQAMessage} style={[styles.qaSendButton, { backgroundColor: tokens.colors.red }]}>
                <MaterialIcons name="send" size={16} color={tokens.colors.light} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 22,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 34,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 12,
  },
  formContainer: {
    gap: 6,
  },
  sectionTitle: {
    ...tokens.textStyles.ndotHeadlineXSmall,
    marginBottom: 4,
  },
  profileHeader: {
    ...tokens.textStyles.ndotHeadlineXSmall,
    marginBottom: 10,
    textAlign: 'center',
  },
  label: {
    ...tokens.textStyles.labelMedium,
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    flexShrink: 1,
  },
  chipText: {
    ...tokens.textStyles.labelMedium,
    fontSize: 10,
  },
  textInput: {
    ...tokens.textStyles.bodySmall,
    fontSize: 11,borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 28,
    marginTop: 2,
  },
  analyzeButton: {
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    flexShrink: 1,
  },
  analyzeButtonText: {
    ...tokens.textStyles.labelUppercasedSmall,
    fontSize: 11,
    fontWeight: '600',
  },
  resultsContainer: {
    gap: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    ...tokens.textStyles.ndotHeadlineXSmall,
  },
  glassContainer: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  glassBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  glassContent: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  resultSectionTitle: {
    ...tokens.textStyles.labelUppercasedMedium,
    fontSize: 11,
    fontWeight: '600',
  },
  listItem: {
    marginLeft: 4,
    marginBottom: 3,
  },
  listItemText: {
    ...tokens.textStyles.bodySmall,
    fontSize: 11,
    lineHeight: 15,
  },
  editInput: {
    ...tokens.textStyles.bodySmall,
    fontSize: 11,
    borderWidth: 1.5,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 1,
  },
  actionButtonText: {
    ...tokens.textStyles.labelUppercasedSmall,
    fontSize: 11,
    fontWeight: '600',
  },
  historyContainer: {
    gap: 8,
  },
  emptyText: {
    ...tokens.textStyles.bodyMedium,
    textAlign: 'center',
    marginTop: 16,
  },
  historyItem: {
    borderWidth: 1.5,
    borderRadius: 8,
    padding: 8,
    gap: 2,
  },
  historyItemTitle: {
    ...tokens.textStyles.labelMedium,
    fontSize: 11,
    fontWeight: '600',
  },
  historyItemDate: {
    ...tokens.textStyles.labelSmall,
    fontSize: 9,
  },
  qaContainer: {
    flex: 1,
    gap: 8,
  },
  qaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qaMessages: {
    flex: 1,
    gap: 6,
  },
  qaMessage: {
    maxWidth: '80%',
    padding: 6,
    borderRadius: 8,
    marginVertical: 2,
  },
  qaMessageText: {
    ...tokens.textStyles.bodySmall,
    fontSize: 11,
  },
  qaInputContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  qaInput: {
    flex: 1,
    ...tokens.textStyles.bodySmall,
    fontSize: 11,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 30,
  },
  qaSendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
});