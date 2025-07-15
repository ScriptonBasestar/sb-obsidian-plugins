export interface FortuneData {
  general: string;
  love: string;
  work: string;
  health: string;
  lucky: {
    number: number;
    color: string;
    item: string;
  };
  warning: string;
}

export interface FortuneSettings {
  enabled: boolean;
  language: 'kr' | 'en';
  zodiacSign?: string; // Optional: 별자리 기반 운세
}

export class FortuneService {
  private readonly fortunes = {
    kr: {
      general: [
        "오늘은 새로운 기회가 찾아올 수 있는 날입니다.",
        "평소보다 신중한 판단이 필요한 하루가 될 것 같습니다.",
        "좋은 소식이 들려올 가능성이 높습니다.",
        "인간관계에서 좋은 변화가 있을 수 있습니다.",
        "창의적인 아이디어가 떠오를 수 있는 날입니다.",
        "안정적이고 평화로운 하루가 될 것 같습니다.",
        "예상치 못한 행운이 따를 수 있습니다.",
        "집중력이 높아져 일의 효율이 좋을 것 같습니다.",
        "주변 사람들과의 소통이 원활한 날입니다.",
        "새로운 배움의 기회가 생길 수 있습니다."
      ],
      love: [
        "연인과의 관계가 더욱 깊어질 수 있습니다.",
        "새로운 만남이 있을 수 있는 날입니다.",
        "소중한 사람과 의미 있는 시간을 보낼 수 있습니다.",
        "마음을 열고 솔직한 대화를 나누어보세요.",
        "사랑하는 사람에게 감사의 마음을 표현해보세요.",
        "관계에서 약간의 오해가 생길 수 있으니 주의하세요.",
        "따뜻한 마음으로 상대방을 이해해보세요.",
        "로맨틱한 분위기를 만들어보는 것이 좋겠습니다.",
        "진심어린 말 한마디가 큰 힘이 될 것입니다.",
        "사랑에 대해 진지하게 생각해보는 시간을 가져보세요."
      ],
      work: [
        "업무에서 좋은 성과를 거둘 수 있을 것 같습니다.",
        "동료들과의 협력이 중요한 하루입니다.",
        "새로운 프로젝트 기회가 생길 수 있습니다.",
        "세심한 주의가 필요한 일이 있을 수 있습니다.",
        "창의적인 해결책을 찾을 수 있는 날입니다.",
        "리더십을 발휘할 기회가 올 수 있습니다.",
        "중요한 결정을 내려야 할 수 있습니다.",
        "실력을 인정받을 기회가 있을 것 같습니다.",
        "팀워크가 빛을 발하는 하루가 될 것입니다.",
        "꾸준한 노력이 결실을 맺을 수 있습니다."
      ],
      health: [
        "컨디션이 좋은 하루가 될 것 같습니다.",
        "충분한 휴식을 취하는 것이 중요합니다.",
        "가벼운 운동이 도움이 될 것 같습니다.",
        "스트레스 관리에 신경 쓰세요.",
        "균형 잡힌 식사를 하시기 바랍니다.",
        "수분 섭취를 충분히 하세요.",
        "몸의 신호에 귀 기울여보세요.",
        "일찍 잠자리에 드는 것이 좋겠습니다.",
        "명상이나 요가가 도움이 될 수 있습니다.",
        "건강검진을 고려해보시기 바랍니다."
      ],
      warning: [
        "서두르지 말고 차근차근 진행하세요.",
        "금전 관리에 주의가 필요합니다.",
        "감정적인 판단은 피하시기 바랍니다.",
        "중요한 약속을 잊지 않도록 주의하세요.",
        "교통안전에 특히 유의하시기 바랍니다.",
        "말 한마디에 신중을 기하세요.",
        "건강 관리에 소홀하지 마세요.",
        "새로운 투자는 신중히 검토하세요.",
        "인간관계에서 오해가 생기지 않도록 주의하세요.",
        "무리한 일정은 피하시기 바랍니다."
      ]
    },
    en: {
      general: [
        "Today brings new opportunities your way.",
        "A day that requires more careful judgment than usual.",
        "Good news is likely to come your way.",
        "Positive changes in relationships are possible.",
        "Creative ideas may emerge today.",
        "A stable and peaceful day awaits you.",
        "Unexpected good fortune may follow.",
        "High concentration will boost work efficiency.",
        "Smooth communication with others today.",
        "New learning opportunities may arise."
      ],
      love: [
        "Your relationship may deepen today.",
        "New encounters are possible today.",
        "Quality time with someone special awaits.",
        "Open your heart for honest conversations.",
        "Express gratitude to your loved ones.",
        "Be careful of minor misunderstandings.",
        "Approach others with a warm heart.",
        "Creating a romantic atmosphere would be nice.",
        "Sincere words will have great power.",
        "Take time to think seriously about love."
      ],
      work: [
        "Good results in work are likely today.",
        "Cooperation with colleagues is important.",
        "New project opportunities may arise.",
        "Careful attention is needed for some tasks.",
        "Creative solutions can be found today.",
        "Leadership opportunities may come.",
        "Important decisions may need to be made.",
        "Your skills may be recognized today.",
        "Teamwork will shine bright today.",
        "Steady efforts may bear fruit."
      ],
      health: [
        "Your condition will be good today.",
        "Getting enough rest is important.",
        "Light exercise would be helpful.",
        "Pay attention to stress management.",
        "Maintain a balanced diet.",
        "Stay well hydrated.",
        "Listen to your body's signals.",
        "Going to bed early would be good.",
        "Meditation or yoga could help.",
        "Consider a health checkup."
      ],
      warning: [
        "Don't rush, proceed step by step.",
        "Be careful with financial management.",
        "Avoid emotional judgments.",
        "Don't forget important appointments.",
        "Pay special attention to traffic safety.",
        "Be careful with your words.",
        "Don't neglect health management.",
        "Consider new investments carefully.",
        "Avoid misunderstandings in relationships.",
        "Avoid overcommitting your schedule."
      ]
    }
  };

  private readonly luckyNumbers = [1, 3, 7, 9, 13, 21, 27, 33, 42, 88];
  private readonly colors = {
    kr: ['빨강', '파랑', '노랑', '초록', '보라', '주황', '분홍', '흰색', '검정', '금색'],
    en: ['red', 'blue', 'yellow', 'green', 'purple', 'orange', 'pink', 'white', 'black', 'gold']
  };
  private readonly items = {
    kr: ['동전', '열쇠', '펜', '책', '꽃', '커피', '음악', '향수', '반지', '시계'],
    en: ['coin', 'key', 'pen', 'book', 'flower', 'coffee', 'music', 'perfume', 'ring', 'watch']
  };

  getFortune(settings: FortuneSettings): FortuneData {
    if (!settings.enabled) {
      return this.getEmptyFortune(settings.language);
    }

    const lang = settings.language;
    const today = new Date();
    const seed = this.getDaySeed(today);

    return {
      general: this.getRandomItem(this.fortunes[lang].general, seed),
      love: this.getRandomItem(this.fortunes[lang].love, seed + 1),
      work: this.getRandomItem(this.fortunes[lang].work, seed + 2),
      health: this.getRandomItem(this.fortunes[lang].health, seed + 3),
      lucky: {
        number: this.getRandomItem(this.luckyNumbers, seed + 4),
        color: this.getRandomItem(this.colors[lang], seed + 5),
        item: this.getRandomItem(this.items[lang], seed + 6)
      },
      warning: this.getRandomItem(this.fortunes[lang].warning, seed + 7)
    };
  }

  formatFortune(fortune: FortuneData, settings: FortuneSettings): string {
    if (!settings.enabled) {
      return settings.language === 'kr' ? '운세 정보 없음' : 'Fortune unavailable';
    }

    const lang = settings.language;
    
    if (lang === 'kr') {
      return `🔮 ${fortune.general}`;
    } else {
      return `🔮 ${fortune.general}`;
    }
  }

  formatDetailedFortune(fortune: FortuneData, settings: FortuneSettings): string {
    if (!settings.enabled) {
      return settings.language === 'kr' ? '운세 정보 없음' : 'Fortune unavailable';
    }

    const lang = settings.language;
    
    if (lang === 'kr') {
      return `🔮 **오늘의 운세**

**💫 종합운:** ${fortune.general}

**💕 연애운:** ${fortune.love}

**💼 직장운:** ${fortune.work}

**🏥 건강운:** ${fortune.health}

**🍀 행운의 키워드**
- 숫자: ${fortune.lucky.number}
- 색깔: ${fortune.lucky.color}
- 아이템: ${fortune.lucky.item}

**⚠️ 주의사항:** ${fortune.warning}`;
    } else {
      return `🔮 **Today's Fortune**

**💫 General:** ${fortune.general}

**💕 Love:** ${fortune.love}

**💼 Career:** ${fortune.work}

**🏥 Health:** ${fortune.health}

**🍀 Lucky Keywords**
- Number: ${fortune.lucky.number}
- Color: ${fortune.lucky.color}
- Item: ${fortune.lucky.item}

**⚠️ Warning:** ${fortune.warning}`;
    }
  }

  private getDaySeed(date: Date): number {
    // Create a consistent seed based on the date
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return year * 10000 + month * 100 + day;
  }

  private getRandomItem<T>(array: T[], seed: number): T {
    // Simple PRNG for consistent daily results
    const index = Math.abs(seed * 9301 + 49297) % array.length;
    return array[index];
  }

  private getEmptyFortune(language: 'kr' | 'en'): FortuneData {
    const empty = language === 'kr' ? '운세 정보 없음' : 'Fortune unavailable';
    return {
      general: empty,
      love: empty,
      work: empty,
      health: empty,
      lucky: {
        number: 0,
        color: empty,
        item: empty
      },
      warning: empty
    };
  }
}