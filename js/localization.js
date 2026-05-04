// Localization JavaScript interop functions
window.localization = {
    /**
     * Set the document direction (ltr or rtl)
     * @param {string} direction - 'ltr' or 'rtl'
     */
    setDocumentDirection: function(direction) {
        document.documentElement.dir = direction;
        document.body.dir = direction;

        // Add/remove RTL class for CSS targeting
        if (direction === 'rtl') {
            document.documentElement.classList.add('rtl');
            document.body.classList.add('rtl');
        } else {
            document.documentElement.classList.remove('rtl');
            document.body.classList.remove('rtl');
        }
    },

    /**
     * Set the document language attribute
     * @param {string} langCode - Language code (e.g., 'en', 'prs', 'ps')
     */
    setDocumentLanguage: function(langCode) {
        document.documentElement.lang = langCode;
    },

    /**
     * Set the font family for the document
     * @param {string} fontFamily - CSS font-family value
     */
    setFontFamily: function(fontFamily) {
        document.body.style.fontFamily = fontFamily;
    },

    /**
     * Update SEO meta tags
     * @param {string} title - Page title
     * @param {string} description - Meta description
     * @param {string} langCode - Language code
     */
    updateMetaTags: function(title, description, langCode) {
        // Update page title
        document.title = title;

        // Update meta title
        const metaTitle = document.querySelector('meta[name="title"]');
        if (metaTitle) {
            metaTitle.content = title;
        }

        // Update meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = description;
        }

        // Update meta language
        const metaLanguage = document.querySelector('meta[name="language"]');
        if (metaLanguage) {
            metaLanguage.content = this.getLanguageEnglishName(langCode);
        }

        // Update Open Graph tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            ogTitle.content = title;
        }

        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription) {
            ogDescription.content = description;
        }

        const ogLocale = document.querySelector('meta[property="og:locale"]');
        if (ogLocale) {
            ogLocale.content = this.getLocaleCode(langCode);
        }

        // Update Twitter tags
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) {
            twitterTitle.content = title;
        }

        const twitterDescription = document.querySelector('meta[name="twitter:description"]');
        if (twitterDescription) {
            twitterDescription.content = description;
        }
    },

    /**
     * Update JSON-LD structured data
     * @param {string} name - Application name
     * @param {string} description - Application description
     */
    updateJsonLd: function(name, description) {
        const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
        if (jsonLdScript) {
            try {
                const data = JSON.parse(jsonLdScript.textContent);
                data.name = name;
                data.description = description;
                jsonLdScript.textContent = JSON.stringify(data, null, 2);
            } catch (e) {
                console.error('Error updating JSON-LD:', e);
            }
        }
    },

    /**
     * Get English name for language code
     * @param {string} langCode - Language code
     * @returns {string} English language name
     */
    getLanguageEnglishName: function(langCode) {
        const languages = {
            'en': 'English',
            'prs': 'Dari',
            'ps': 'Pashto',
            'uz': 'Uzbek',
            'tk': 'Turkmen',
            'haz': 'Hazaragi',
            'aiq': 'Aimaq',
            'bal': 'Balochi',
            'psi': 'Pashai',
            'ktr': 'Nuristani'
        };
        return languages[langCode] || 'English';
    },

    /**
     * Get locale code for Open Graph
     * @param {string} langCode - Language code
     * @returns {string} Locale code
     */
    getLocaleCode: function(langCode) {
        const locales = {
            'en': 'en_US',
            'prs': 'fa_AF',  // Dari uses Farsi locale as fallback
            'ps': 'ps_AF',
            'uz': 'uz_UZ',
            'tk': 'tk_TM',
            'haz': 'fa_AF',  // Hazaragi uses Farsi locale as fallback
            'aiq': 'fa_AF',  // Aimaq uses Farsi locale as fallback
            'bal': 'bal_AF',
            'psi': 'ps_AF',  // Pashai uses Pashto locale as fallback
            'ktr': 'ps_AF'   // Nuristani uses Pashto locale as fallback
        };
        return locales[langCode] || 'en_US';
    },

    /**
     * Add hreflang links for SEO
     * @param {Array} languages - Array of {code, url} objects
     */
    addHreflangLinks: function(languages) {
        // Remove existing hreflang links
        document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

        // Add new hreflang links
        languages.forEach(lang => {
            const link = document.createElement('link');
            link.rel = 'alternate';
            link.hreflang = lang.code;
            link.href = lang.url;
            document.head.appendChild(link);
        });

        // Add x-default
        const defaultLink = document.createElement('link');
        defaultLink.rel = 'alternate';
        defaultLink.hreflang = 'x-default';
        defaultLink.href = window.location.origin + window.location.pathname;
        document.head.appendChild(defaultLink);
    },

    /**
     * Store language preference
     * @param {string} langCode - Language code
     */
    saveLanguage: function(langCode) {
        try {
            localStorage.setItem('language', langCode);
        } catch (e) {
            console.error('Error saving language preference:', e);
        }
    },

    /**
     * Get stored language preference
     * @returns {string|null} Stored language code or null
     */
    getStoredLanguage: function() {
        try {
            return localStorage.getItem('language');
        } catch (e) {
            return null;
        }
    },

    /**
     * Detect browser language
     * @returns {string} Browser language code
     */
    detectBrowserLanguage: function() {
        return navigator.language || navigator.userLanguage || 'en';
    }
};
