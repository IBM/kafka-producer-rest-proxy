const extractErrorType = (error, event) => {
    let errorType = "unknown";
    Object.keys(extractors).forEach(ruleName => {
        if (extractors[ruleName](error, event)) {
            errorType = ruleName;
        }
    });
    return errorType;
};

const deviceCountryNull = (error) => {
    return error && error.keyword === "type" && error.dataPath === ".attributes.deviceCountry";

};

const sessionDurationMaximum = (error) => {
    return error && error.keyword === "maximum" && error.dataPath === ".attributes.sessionDuration";

};

const sessionDurationMinimum = (error) => {
    return error && error.keyword === "minimum" && error.dataPath === ".attributes.sessionForegroundDuration";

};

const sessionNull = (error) => {
    return error && error.keyword === "type" && error.dataPath === ".sessionId";

};

const userAttrPremiumNull = (error) => {
    return error && error.keyword === "type" && error.dataPath === ".attributes.premium";

};


const userAttrPersonalizedAdsNull = (error) => {
    return error && error.keyword === "type" && error.dataPath === ".attributes.personalizedAds";

};

const additionalProperties = (error) => {
    return error && error.keyword === "additionalProperties";

};

const extractors = {
    "deviceCountry null": deviceCountryNull,
    "sessionDuration maximum": sessionDurationMaximum,
    "sessionDuration negative": sessionDurationMinimum,
    "premium null": userAttrPremiumNull,
    "personalizedAds null": userAttrPersonalizedAdsNull,
    "additionalProperties": additionalProperties,
    "sessionId null": sessionNull
};

class ErrorTypeExtractor {
    constructor() {
        // noinspection JSUnusedGlobalSymbols,JSUnusedGlobalSymbols,JSUnusedGlobalSymbols,JSUnusedGlobalSymbols
        this.extractErrorType = extractErrorType;
    }
}

module.exports = ErrorTypeExtractor;
