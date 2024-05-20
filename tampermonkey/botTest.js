// ==UserScript==
// @name         BotTEST
// @version      0.1
// @description  Bot qui répond quand quelqu'un a repondu
// @match        *://*.jklm.fun/*
// ==/UserScript==
const answerInput = document.querySelector('input.styled[type="text"]');
const API_BASE_URL = "http://localhost:8081";
const CHECK_ENDPOINT = "/check/";
const POST_ENDPOINT = "/";
const POST_UPDATE_SHORT = "/update-short/"
const MONITOR_INTERVAL = 3000;
const QUERY_SELECTORS = {
    challenge: '.challenge',
    question: '.prompt',
    imageWrapper: '.image',
    textWrapper: '.textScroll',
    answerWrapper: '.challengeResult',
    input: '.round.guessing input'
};

var table = "dataFR"
var answerForCurrentChallenge
var shortestAnswerForCurrentChallenge
var answerIsRegistered
var shortForCurrentChallenge
var alreadyAnswered = false


const socket_onSetup = (data) => {
    switch (data.rules.dictionaryId.value){
        case "fr" : table = "dataFR"; break;
        case "en" : table = "dataEN"; break;
        case "es" : table = "dataES"; break;
    }
    console.log("Table has been set to : ", table)
}

const socket_onSetDictionary = (rules) => {

    switch (rules.dictionaryId){
        case "fr" : table = "dataFR"; break;
        case "en" : table = "dataEN"; break;
        case "es" : table = "dataES"; break;
    }
    console.log("table has been changed to : ", table)
}


const socket_onStartChallenge = async(data, endtime) => {
    alreadyAnswered = false
    await getAnswer() // setting answerForCurrentChallenge and shortestAnswerForCurrentChallenge
    alreadyAnswered = false
    console.log("---------------------------------------------------------")
    console.log("answer : " , answerForCurrentChallenge, " short : ", shortestAnswerForCurrentChallenge)
}
const socket_onSetPlayerState = (playerId, data) => {
    const players = milestone.playerStatesByPeerId

    if(players[playerId].hasFoundSource && !alreadyAnswered) answerChallenge()
    if(players[playerId].hasFoundSource && String(players[playerId].guess).length < String(shortestAnswerForCurrentChallenge).length){

    }
}

const socket_onEndChallenge = async(dataChallenge) => {
    var shortestAnswerGiven
    const players = milestone.playerStatesByPeerId
    console.log(players)
    for (const [key, value] of Object.entries(players)) {
        if(value.hasFoundSource && String(value.guess).length < String(shortestAnswerForCurrentChallenge).length){
            shortestAnswerGiven = value.guess
        }
    }
    if(String(shortestAnswerGiven).length < String(shortestAnswerForCurrentChallenge).length && shortestAnswerGiven != null){
        console.log('shortestAnswerGiven :' , shortestAnswerGiven , "  shortestAnswerForCurrentChallenge : ", shortestAnswerForCurrentChallenge)
        const state = { answerRevealed: false };
        const players = milestone.playerStatesByPeerId
        const challengeElements = {
            challenge: document.querySelector(QUERY_SELECTORS.challenge),
            question: extractText(document, QUERY_SELECTORS.question),
            imageWrapper: document.querySelector(QUERY_SELECTORS.imageWrapper),
            textWrapper: document.querySelector(QUERY_SELECTORS.textWrapper),
            answerWrapper: document.querySelector(QUERY_SELECTORS.answerWrapper)
        };

        if (!challengeElements.answerWrapper.hidden && !state.answerRevealed) {
            state.answerRevealed = true;
            const contentHash = challengeElements.imageWrapper.hidden
            ? generateHash(challengeElements.question + extractText(challengeElements.textWrapper, '.text'))
            : await hashImageContent(challengeElements.imageWrapper.querySelector('.actual'), challengeElements.question)

            await update_shortFR(contentHash, shortestAnswerGiven);
            console.log('Short registered for prompt ' + contentHash + '  : ' + shortestAnswerGiven)
        }
    }
}

const recordShort = (players, milestone) => {
    for (const [key, value] of Object.entries(players)) {
        console.log(`${key}: ${value}`);

        console.log("hasfoundsource : ", value)
        if(value.hasFoundSource && value.guess.length < answerForCurrentChallenge.lenght){
            // replace dans la db la value par le short
            console.log()
        }
    }

}

socket.on("startChallenge", socket_onStartChallenge)
socket.on("setPlayerState", socket_onSetPlayerState)
socket.on("endChallenge", socket_onEndChallenge);
socket.on("setup", socket_onSetup);
socket.on("setDictionary", socket_onSetDictionary);


const GREEN_BACKGROUND = "background: #85D492; color: #000";
const RED_BACKGROUND = "background: #D68280; color: #000";
const BLUE_BACKGROUND = "background: #80A5D6; color: #000";

const UNKNOWN_ANSWER_TEXT = 'Unknown answer';

const hashCode = (str) => [...str].reduce((hash, char) => Math.imul(31, hash) + char.charCodeAt(0) | 0, 0);

const fetchJSON = async (url, options = {}) => {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            if (response.status === 404) {
                // Silently handle 404 errors
                return { exists: false };
            }
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error.message);
        return { error: true };
    }
};


const answerRevealObserver = new MutationObserver((mutations, obs) => {
    const inputElement = document.querySelector(QUERY_SELECTORS.input);
    if (inputElement && !document.querySelector(QUERY_SELECTORS.answerWrapper).hidden) {
        inputElement.placeholder = '';
        obs.disconnect();
    }
});

const postAnswer = async (hash, answer,short) => {
    try {
        await fetchJSON(API_BASE_URL + POST_ENDPOINT, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key: hash, value: answer,short :  short})
        });
    } catch (error) {
        console.error('Error posting answer:', error);
    }
};

const update_shortFR = async (hash, short) => {
    try {
        await fetchJSON(API_BASE_URL + POST_UPDATE_SHORT, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key: hash, short: short })
        });
    } catch (error) {
        console.error('Error posting answer:', error);
    }
}

const extractText = (element, selector) => element.querySelector(selector)?.innerText || '';

const generateHash = (content) => hashCode(content);

const hashImageContent = async (imageElement, additionalText = '') => {
    const imageUrl = imageElement.style.backgroundImage.slice(5, -2);
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(generateHash(additionalText + reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const processChallengeContent = async (elements, state) => {
    const { question, imageWrapper, textWrapper, answerWrapper } = elements;
    if (!answerWrapper.hidden && !state.answerRevealed) {
        state.answerRevealed = true;
        const answerContent = extractText(answerWrapper, '.value');
        const contentHash = imageWrapper.hidden
        ? generateHash(question + extractText(textWrapper, '.text'))
        : await hashImageContent(imageWrapper.querySelector('.actual'), question);

        const checkResponse = await fetchJSON(API_BASE_URL + CHECK_ENDPOINT + contentHash);
        if (!checkResponse.exists && !checkResponse.error) {
            await postAnswer(contentHash, answerContent, shortestAnswerGiven);
        }
    } else if (answerWrapper.hidden) {
        state.answerRevealed = false;
    }
    //answerChallenge()
};

const monitorChallenge = async () => {
    const state = { answerRevealed: false };
    setInterval(async () => {
        const challengeElements = {
            challenge: document.querySelector(QUERY_SELECTORS.challenge),
            question: extractText(document, QUERY_SELECTORS.question),
            imageWrapper: document.querySelector(QUERY_SELECTORS.imageWrapper),
            textWrapper: document.querySelector(QUERY_SELECTORS.textWrapper),
            answerWrapper: document.querySelector(QUERY_SELECTORS.answerWrapper)
        };
        if (challengeElements.challenge) {
            await processChallengeContent(challengeElements, state);
        }
    }, MONITOR_INTERVAL);

};

const handleInputEvent = async (event) => {
    const { target: inputElement } = event;
    if (inputElement.value.includes('+')) {
        const { question, imageWrapper, textWrapper } = {
            question: extractText(document, QUERY_SELECTORS.question),
            imageWrapper: document.querySelector(QUERY_SELECTORS.imageWrapper),
            textWrapper: document.querySelector(QUERY_SELECTORS.textWrapper)
        };

        const contentHash = imageWrapper.hidden
        ? generateHash(question + extractText(textWrapper, '.text'))
        : await hashImageContent(imageWrapper.querySelector('.actual'), question);

        answerRevealObserver.observe(document.querySelector(QUERY_SELECTORS.answerWrapper), { attributes: true });
        inputElement.value = '';
        try {
            const data = await fetchJSON(API_BASE_URL + CHECK_ENDPOINT + contentHash);
            console.log(data)
            if (data.exists) {
                inputElement.placeholder = data.value;
            } else {
                inputElement.placeholder = 'oups ^^\'';
            }
        } catch (error) {
            inputElement.placeholder = 'Error checking answer';
        }
    }
};

const handleKeydownEvent = (event) => {
    const { target: inputElement } = event;
    if (event.key === 'Tab' && inputElement.placeholder !== UNKNOWN_ANSWER_TEXT) {
        event.preventDefault();
        if (inputElement.placeholder) {
            inputElement.value = inputElement.placeholder;
            inputElement.placeholder = '';
        }
    }
};

(() => {
    console.log('[Pop Sauce Hack] Script initiated');
    monitorChallenge();

    setTimeout(() => {
        const input = document.querySelector(QUERY_SELECTORS.input);
        if (input) {
            input.addEventListener('input', handleInputEvent);
            input.addEventListener('keydown', handleKeydownEvent);
        }
    }, MONITOR_INTERVAL);
})();

const answerChallenge = async () => {
    alreadyAnswered = true
        answerInput.value = '';
        try {
            if (answerIsRegistered) {
                answerInput.value = answerForCurrentChallenge;
            } else {
                answerInput.value = ' hum ^^\'';
            }
        } catch (error) {
            answerInput.value = 'ptit flop ';
        }
    socket.emit("submitGuess", answerInput.value)
    answerForCurrentChallenge = answerInput.value
}

const getAnswer = async() => {
    const { _question, _imageWrapper, _textWrapper } = {
        _question: extractText(document, QUERY_SELECTORS.question),
        _imageWrapper: document.querySelector(QUERY_SELECTORS.imageWrapper),
        _textWrapper: document.querySelector(QUERY_SELECTORS.textWrapper)
    };
    const contentHash = _imageWrapper.hidden
    ? generateHash(_question + extractText(_textWrapper, '.text'))
    : await hashImageContent(_imageWrapper.querySelector('.actual'), _question);

    answerRevealObserver.observe(document.querySelector(QUERY_SELECTORS.answerWrapper), { attributes: true });
    try {
        const data = await fetchJSON(API_BASE_URL + CHECK_ENDPOINT + contentHash);
        console.log("data received : ", data)
        answerIsRegistered = data.exists
        if (data.exists) {
            answerForCurrentChallenge = data.value[0]
            shortForCurrentChallenge = data.value[1]
            shortestAnswerForCurrentChallenge = data.value[1]
            if(shortestAnswerForCurrentChallenge == null) shortestAnswerForCurrentChallenge = answerForCurrentChallenge
        }
    } catch (error) {}
}



