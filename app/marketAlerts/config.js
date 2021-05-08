/**
 * Market Alert Config
 *
 * Contains messages translations etc.
 */

const titles = {
	'en': 'Market Notification',
	'es': 'Notificaciones del Mercado',
	'pl': 'Notyfikacja z Rynku',
	'ar': 'إخطارات السوق',
	'zh-hans': '市场价格提醒',
	'it': 'Notifiche di Mercato',
	'de': 'Marktbenachrichtigung',
	'ja': '銘柄情報',
};

const date = {
	html: {
		en: '<span class="eventDate">%%date%% GMT</span>',
	},
	native: {
		en: "%%date%% GMT",
	}
};

const oneHourHighLow = {
	html: {
		"en": '<span dir="ltr"><strong>%%instrument%% at %%price%%</strong> (%%diff%%)</span>',
	},
	native: {
		"en": "%%instrument%% at %%price%% (%%diff%%)",
	}
};

const thirtyDayLow = {
	"en": "%%instrument%% trading at a 30 day low (%%price%%)",
	"es": "%%instrument%% cotizando al nivel más bajo de los últimos 30 días (%%price%%)",
	"pl": "%%instrument%% kurs na 30 dniowym spadku (%%price%%)",
	"ar": "%%instrument%% يتداول عند أدنى مستوى لمدة 30 يوما (%%price%%)",
	"zh-hans": "%%instrument%% 跌至30日低位 (%%price%%)",
	"it": "%%instrument%% trading di 30 giorni al suo minimo (%%price%%)",
	"de": "%%instrument%% handelt auf einem 30-Tage-Tief (%%price%%)",
	"ja": "%%instrument%% は直近30日の安値をつけました(%%price%%)",
};

const thirtyDayHigh = {
	"en": "%%instrument%% trading at a 30 day high (%%price%%)",
	"es": "%%instrument%% cotizando al nivel más alto de los últimos 30 días (%%price%%)",
	"pl": "%%instrument%% kurs na 30 dniowym wzroście (%%price%%)",
	"ar": "%%instrument%% يتداول عند أعلى مستوى لمدة 30 يوما (%%price%%)",
	"zh-hans": "%%instrument%% 升至30日高位 (%%price%%)",
	"it": "%%instrument%% trading di 30 giorni al suo massimo (%%price%%)",
	"de": "%%instrument%% handelt auf einem 30-Tage-Hoch (%%price%%)",
	"ja": "%%instrument%% は直近30日の高値をつけました(%%price%%)",
};

const ninetyDayLow = {
	"en": "%%instrument%% trading at a 90 day low (%%price%%)",
	"es": "%%instrument%% cotizando al nivel más bajo de los últimos 90 días (%%price%%)",
	"pl": "%%instrument%% kurs na 90 dniowym spadku (%%price%%)",
	"ar": "%%instrument%%  يتداول عند أدنى مستوى لمدة 90 يوما (%%price%%)",
	"zh-hans": "%%instrument%% 跌至90日低位 (%%price%%)",
	"it": "%%instrument%% trading di 90 giorni al suo minimo (%%price%%)",
	"de": "%%instrument%% handelt auf einem 90-Tage-Tief (%%price%%)",
	"ja": "%%instrument%% は直近90日の安値をつけました(%%price%%)",
};

const ninetyDayHigh = {
	"en": "%%instrument%% trading at a 90 day high (%%price%%)",
	"es": "%%instrument%% cotizando al nivel más alto de los últimos 90 días (%%price%%)",
	"pl": "%%instrument%% kurs na 90 dniowym wzroście (%%price%%)",
	"ar": "%%instrument%% يتداول عند أعلى مستوى لمدة 90 يوما (%%price%%)",
	"zh-hans": "%%instrument%% 升至90日高位 (%%price%%)",
	"it": "%%instrument%% trading di 90 giorni al suo massimo (%%price%%)",
	"de": "%%instrument%% handelt auf einem 90-Tage-Hoch (%%price%%)",
	"ja": "%%instrument%% は直近90日の安値をつけました(%%price%%)",
};

const oneYearLow = {
	"en": "%%instrument%% trading at a 1 year low (%%price%%)",
	"es": "%%instrument%% cotizando al nivel más bajo del año (%%price%%)",
	"pl": "%%instrument%% kurs na rocznym spadku (%%price%%)",
	"ar": "%%instrument%% يتداول عند أدنى مستوى لمدة سنة (%%price%%)",
	"zh-hans": "%%instrument%% 跌至1年来低位 (%%price%%)",
	"it": "%%instrument%% trading di 1 anno al suo minimo (%%price%%)",
	"de": "%%instrument%% handelt auf einem Jahrestief (%%price%%)",
	"ja": "%%instrument%% は直近1年間の安値をつけました(%%price%%)",
};

const oneYearHigh = {
	"en": "%%instrument%% trading at a 1 year high (%%price%%)",
	"es": "%%instrument%% cotizando al nivel más alto del año (%%price%%)",
	"pl": "%%instrument%% kurs na rocznym wzroście (%%price%%)",
	"ar": "%%instrument%% يتداول عند أعلى مستوى لمدة سنة (%%price%%)",
	"zh-hans": "%%instrument%% 升至1年来高位 (%%price%%)",
	"it": "%%instrument%% trading di 1 anno al suo massimo (%%price%%)",
	"de": "%%instrument%% handelt auf 1 Jahreshoch (%%price%%)",
	"ja": "%%instrument%% は直近1年間の高値をつけました(%%price%%)",
};

// Event Types
const eventList = {
	"1": {
		"name": "1 Hour Min Low Changed", 
		"type": "low", 
		"message": oneHourHighLow
	},
	"2": {
		"name": "1 Hour Max High Changed", 
		"type": "high", 
		"message": oneHourHighLow
	},
	"3": {
		"name": "30 Days Min Low Changed", 
		"type": "low", 
		"message": thirtyDayLow
	},
	"4": {
		"name": "30 Days Max High Changed", 
		"type": "high", 
		"message": thirtyDayHigh 
	},
	"5": {
		"name": "90 Days Min Low Changed", 
		"type": "low", 
		"message": ninetyDayLow
	},
	"6": {
		"name": "90 Days Max High Changed", 
		"type": "high", 
		"message": ninetyDayHigh,
	},
	"7": {
		"name": "1 Year Min Low Changed", 
		"type": "low", 
		"message": oneYearLow
	},
	"8": {
		"name": "1 Year Max High Changed", 
		"type": "high", 
		"message": oneYearHigh
	}
};

module.exports = {
	getTitle: (language) => {
		return titles[language] || '';
	},
	getText: (event, language, type = 'native') => {

		let text = '';
		const data = eventList[event];

		if (data) {

			// Events 1 & 2 have html / native set
			if (event < 3) {
				text = data.message[type][language] || '';
			}
			// Events > 2 surround instrument with string for html
			else {
				if (type === 'html') {
					text = (data.message[language] || '').replace('%%instrument%%', '<strong>%%instrument%%</strong>');
				}
				else {
					text = (data.message[language] || '');
				}
			}

			// Append date
			if (text) {
				if (type === 'html') {
					text += '<br/>' + (date.html[language] ? date.html[language] : date.html['en']);
				}
				else {
					text += "\n\n" + (date.native[language] ? date.native[language] : date.native['en']);
				}
			}
		}

		return text;
	},
	getType: (event) => {
		return eventList[event] ? eventList[event].type : '';
	},
};
