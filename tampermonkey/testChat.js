// ==UserScript==
// @name         Bot TEST
// @version      0.1
// @description  Bot qui répond quand quelqu'un a repondu
// @match        *://*.jklm.fun/*
// ==/UserScript==
const answerInput = document.querySelector('input.styled[type="text"]');
const API_BASE_URL = "http://localhost:8081";
const POST_ENDPOINT = "/"
const POST_ENDPOINT_CHECK = "/check/";
const POST_UPDATE_SHORT = "/update-short/"
const POST_UPDATE_TIME = "/update-time/"
const POST_UPDATE_TIME_SHORT = "/update-time-short/"
const MONITOR_INTERVAL = 3000;
const QUERY_SELECTORS = {
    challenge: '.challenge',
    question: '.prompt',
    imageWrapper: '.image',
    textWrapper: '.textScroll',
    answerWrapper: '.challengeResult',
    input: '.round.guessing input'
};

const badgesByRole = {
  leader: { icon: '👑', text: getText('Party leader', 'role.leader') },
  moderator: { icon: '⚔️', text: getText('Moderator', 'role.moderator') },
  creator: { icon: '🎪', text: getText("JKLM.FUN's creator", 'role.creator') },
  staff: { icon: '⭐', text: getText('JKLM.FUN staff', 'role.staff') },
  bot: { icon: '🤖', text: getText('JKLM.FUN BOT', 'role.bot') },
  banned: { icon: '⛔', text: getText('Banned', 'role.banned') },
}
// Chat
const chatButton = $('.sidebar .tabs .chat');
const chatTab = $('.sidebar > .chat');
const chatLog = $('.sidebar .chat .log');
const setChatFilterButton = $('.sidebar .chat .setChatFilter');
const chatTextArea = $('.chat .input textarea');

let chatMessageCount = 0;
const maxChatMessageCount = 200;

const chatCompletions = [];

var table = "dataFR"
var answerForCurrentChallenge
var shortestAnswerForCurrentChallenge
var answerIsRegistered
var fastestTimeForCurrentChallenge
var fastestTimeMade
var fastestPlayerForCurrentChallenge
var alreadyAnswered = false

var messageNewFastestTime
var messageNewShort


const socket_onSetup = async(data) => {
    if(data.rules.tagOps.length==1 && data.rules.tagOps[0].tag == "Drapeaux"){
        table = "dataFlags";
    }else{
        switch (data.rules.dictionaryId){
            case "fr" : table = "dataFR"; break;
            case "en" : table = "dataEN"; break;
            case "es" : table = "dataES"; break;
        }
    }
    console.log("Table has been set to : ", table)
}

const socket_onSetDictionary = (rules) => {
    console.log("rules : ",rules)
    if(rules.tagOps.length==1 && rules.tagOps[0].tag == "Drapeaux"){
        table = "dataFlags";
    }else{
        switch (rules.dictionaryId){
            case "fr" : table = "dataFR"; break;
            case "en" : table = "dataEN"; break;
            case "es" : table = "dataES"; break;
        }
    }
    console.log("Table has been changed to : ", table)
}


const socket_onStartChallenge = async(data, endtime) => {
    alreadyAnswered = false
    await getAnswer() // resetting answerForCurrentChallenge, shortestAnswerForCurrentChallenge, fastestTimeForCurrentChallenge fastestPlayerForCurrentChallenge
    alreadyAnswered = false
    console.log("------------------startChallenge------------------")
    console.log("answer : " , answerForCurrentChallenge, " short : ", shortestAnswerForCurrentChallenge)
    console.log("chat test : ",answerForCurrentChallenge)
    socket.emit("chat", answerForCurrentChallenge);
    console.log("chat test finnn ")
}

const socket_onSetPlayerState = async(playerId, data) => {
    const players = milestone.playerStatesByPeerId
    const elapsedTime = parseInt(data.elapsedTime)/1000
    if(data.hasFoundSource && !alreadyAnswered) answerChallenge()
    if(data.hasFoundSource && elapsedTime < fastestTimeMade){
        fastestTimeMade = elapsedTime
    }
}

const socket_onEndChallenge = async(dataChallenge) => {
    var shortestAnswerGiven
    var fastestPlayer = dataChallenge.fastest
    const state = { answerRevealed: false };
    const players = milestone.playerStatesByPeerId
    const challenge = document.querySelector(QUERY_SELECTORS.challenge)
    const question = extractText(document, QUERY_SELECTORS.question)
    const imageWrapper = document.querySelector(QUERY_SELECTORS.imageWrapper)
    const textWrapper = document.querySelector(QUERY_SELECTORS.textWrapper)
    const answerWrapper = document.querySelector(QUERY_SELECTORS.answerWrapper)
    const answerContent = extractText(answerWrapper, '.value');
    const contentHash = imageWrapper.hidden
    ? generateHash(question + extractText(textWrapper, '.text'))
    : await hashImageContent(imageWrapper.querySelector('.actual'), question);

    for (const [key, value] of Object.entries(players)) {
        if(value.hasFoundSource && String(value.guess).length < String(shortestAnswerForCurrentChallenge).length){
            shortestAnswerGiven = value.guess
        }
    }

    const checkResponse = await fetchJSON(API_BASE_URL + POST_ENDPOINT_CHECK + table + "/" + contentHash);
    console.log("check reponse on end : ", checkResponse)
    if (!checkResponse.exists && !checkResponse.error) { //si ya pas dans la base
        await postAnswer(contentHash, answerContent, shortestAnswerGiven, fastestTimeMade,fastestPlayer );
        console.log('insert dans ' + table +' : ' , answerContent, shortestAnswerGiven ,fastestTimeMade,fastestPlayer)
    }
    else{
        if(String(shortestAnswerGiven).length < String(shortestAnswerForCurrentChallenge).length && shortestAnswerGiven != null){ //if new short
            if(fastestTimeMade < fastestTimeForCurrentChallenge) { //if new short & new fastest
                await update_time_short(contentHash,shortestAnswerGiven, fastestTimeMade ,fastestPlayer)
                messageNewFastestTime = fastestPlayer + " now holds the record with : " + fastestTimeMade + " (new short & new fastest)"
                console.log(messageNewFastestTime)
            }
            else{
                await update_short(contentHash, shortestAnswerGiven); // just new short
                messageNewShort = "New short '" + shortestAnswerGiven + "' for prompt : " + contentHash
                console.log(messageNewShort)
            }
            console.log('NEW SHORT registered for prompt ' + contentHash + '  : ' + shortestAnswerGiven)
        }else if(fastestTimeMade < fastestTimeForCurrentChallenge){ // just new fastest
            await update_time(contentHash, fastestTimeMade ,fastestPlayer)
            messageNewFastestTime = fastestPlayer + " now holds the record with : " + fastestTimeMade + " (new fastest)"
            console.log(messageNewFastestTime)

        }
    }
}

function socket_onChat(authorProfile, text, customProperties = {}) {
    console.log("test in socket on chat");
  if (settings.chatFilter.length > 0)
    text = text
      .split(' ')
      .map(x =>
        settings.chatFilter.includes(x.toLowerCase())
          ? '■'.repeat(x.length)
          : x,
      )
      .join(' ');
  if (authorProfile.peerId !== selfPeerId && roomEntry.isPublic)
    text = text
      .split(' ')
      .map(x =>
        publicChatFilter.includes(x.toLowerCase()) ? '■'.repeat(x.length) : x,
      )
      .join(' ');

  appendToChat(authorProfile, text, customProperties);
}

const socket_onAddPlayer = async(data, data2) => {
    console.log("data : " , data ,"    data2 : ", data2)
    //socket.emit("startRoundNow") (juste pour les garder)
    //socket.emit("leaveRound")
    //socket.emit("joinRound")
}



socket.on("addPlayer", socket_onAddPlayer)
socket.on("startChallenge", socket_onStartChallenge)
socket.on("setPlayerState", socket_onSetPlayerState)
socket.on("endChallenge", socket_onEndChallenge);
socket.on("setup", socket_onSetup);
socket.on("setDictionary", socket_onSetDictionary);
socket.on("chat", socket_onChat);



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

const postAnswer = async (hash, answer,short,time,owner) => {
    try {
        await fetchJSON(API_BASE_URL + POST_ENDPOINT, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key: hash,table: table, value: answer,short :  short, time : time, owner : owner})
        });
    } catch (error) {
        console.error('Error posting answer:', error);
    }
};

const update_short = async (hash, short) => {
    try {
        await fetchJSON(API_BASE_URL + POST_UPDATE_SHORT, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key: hash, table:table, short: short })
        });
    } catch (error) {
        console.error('Error posting answer:', error);
    }
}

const update_time = async (hash, time, player) => {
    try {
        await fetchJSON(API_BASE_URL + POST_UPDATE_TIME, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ key: hash, table: table, time: time, owner: player })
        });
    } catch (error) {
        console.error('Error posting answer:', error);
    }
}

const update_time_short = async (hash, short, time, player) => {
    try {
        const response = await fetch(API_BASE_URL + POST_UPDATE_TIME_SHORT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: hash, table: table, short: short, time: time, owner: player })
        });
        const data = await response.json();
        console.log('Response:', data);
    } catch (error) {
        console.error('Error posting answer:', error);
    }
};

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
        const data = await fetchJSON(API_BASE_URL + POST_ENDPOINT_CHECK + table + "/" + contentHash);
        console.log("data received : ", data)
        answerIsRegistered = data.exists
        if (data.exists) {
            answerForCurrentChallenge = data.value
            shortestAnswerForCurrentChallenge = data.short
            fastestTimeForCurrentChallenge = data.time
            fastestPlayerForCurrentChallenge = data.owner
            if(shortestAnswerForCurrentChallenge == null) shortestAnswerForCurrentChallenge = answerForCurrentChallenge
            if(fastestTimeForCurrentChallenge == null) fastestTimeForCurrentChallenge = 15
            if(fastestPlayerForCurrentChallenge = null) fastestPlayerForCurrentChallenge = ""
            fastestTimeMade = fastestTimeForCurrentChallenge

        }else{
            fastestTimeMade = 15
            fastestPlayerForCurrentChallenge = ""
            shortestAnswerForCurrentChallenge = answerForCurrentChallenge
        }

    } catch (error) {}
    console.log('answerForCurrentChallenge : ', answerForCurrentChallenge , "   shortestAnswerForCurrentChallenge : ", shortestAnswerForCurrentChallenge)
    console.log('fastestTimeForCurrentChallenge : ', fastestTimeForCurrentChallenge, '   fastestPlayerForCurrentChallenge : ' , fastestPlayerForCurrentChallenge)
    answerInput.value = shortestAnswerForCurrentChallenge
}


function appendToChat(authorProfile, text, customProperties = null, date = new Date(), allowNotifications = true) {
  beforeAppendingToChat(authorProfile, text, customProperties, date);

  const isScrolledToBottom = chatLog.scrollHeight - chatLog.clientHeight - chatLog.scrollTop < 10;

  const logEntry = createLogEntry(authorProfile, customProperties);

  appendTime(date, logEntry);

  if (authorProfile?.isBroadcast) {
    appendBroadcastInfo(logEntry, authorProfile, text);
  } else {
    if (authorProfile != null) {
      appendAuthorInfo(logEntry, authorProfile);
    }

    const linkifiedText = linkifyText(text);
    $make('span', logEntry, { className: 'text', innerHTML: linkifiedText });
  }

  if (isScrolledToBottom) {
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  afterAppendingToChat();
}

function beforeAppendingToChat(authorProfile, text, customProperties, date) {
  //empty
}

function appendTime(date, logEntry) {
  const hoursMinutesSeconds = getTime(date);
  $make('span', logEntry, {
    className: 'time',
    textContent: hoursMinutesSeconds,
  });
  $makeText(' ', logEntry);
}

function appendBroadcastInfo(logEntry, authorProfile, text) {
  const broadcast = $make('span', logEntry, { className: 'broadcast' });
  $make('span', broadcast, {
    className: 'author',
    textContent: authorProfile.nickname,
  });
  $makeText(`: ${text}`, broadcast);
}

function appendAuthorInfo(logEntry, authorProfile) {
  const roles = authorProfile.roles != null ? authorProfile.roles : [];
  const badgesElt = $make('span', logEntry, { className: 'badges' });
  for (const role of roles) {
    const badge = badgesByRole[role];
    $make('span', badgesElt, {
      textContent: badge.icon,
      title: badge.text,
    });
  }
}

function afterAppendingToChat() {
  //empty
}