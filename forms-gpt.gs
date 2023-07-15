
const ADDON_TITLE = 'FormsGPT - Generate Forms Instantly';
const NOTICE = `FormsGPT is currently a working prototype to generate data and import it into Google Forms. By using OpenAI's
GPT model, we generate data to be interpreted within Google Forms from User's text input. That being said, we would require
special credentials provided from the User to operate correctly. We DO NOT save any credentials you send to FormsGPT, we only
use it for one-time calls to OpenAI's GPT API and you need to re-enter the credentials for new sessions. Use at your own risk.`

function onOpen(e) {
  try {
    var ui = FormApp.getUi();
    // Or DocumentApp or FormApp.
    ui.createAddonMenu()
      .addItem('Generate Form', 'openSBGenerateQuestion')
      .addItem('About', 'openSBAbout')
      .addToUi();
  } catch (e) {
    Logger.log('Error [onOpen]: ' + e.error);
  }
}

function onInstall(e) {
  onOpen(e);
}

function openSBGenerateQuestion() {
  try {
    var htmlOutput = HtmlService
      .createTemplateFromFile('sbGenerateQuestion')
      .evaluate()
      .setTitle('Generate Form Data');
    FormApp.getUi().showSidebar(htmlOutput);
  } catch (e) {
    Logger.log('Error [openSBGenerateQuestion]: ' + e.error);
  }
}

function openSBAbout() {
  try {
    const ui = HtmlService.createHtmlOutputFromFile('sbAbout')
        .setWidth(420)
        .setHeight(270);
    FormApp.getUi().showModalDialog(ui, 'About FormsGPT');
  } catch (e) {
    Logger.log('Error [openSBAbout]: ' + e.error);
  }
}

function instructText(topic, extra, qNum, cNum) {
  var instruction = `Give me a set of {qNum} questions in the format of Multiple Choice, Checkboxes, Dropdown, or Long Paragraph Answers. The questions are about a "{topic}," each with a maximum of {cNum} choices of answers. {extra}. Output the questions and answers into a JSON Format like the examples below.

JSON Format:

{
	"form_title": "<The Title of this Form>",
	"form_description": "<The Description of this Form>",
	"form_questions": [{
		"question_str": "<The Text of the Question>",
		"question_type": "<The Question Type>"
		"answer_choices" : [
			{"choice": "<Answer Choice>"},
			{"choice": "<Answer Choice>"},
			{"choice": "<Answer Choice>"},
			{"choice": "<Answer Choice>"}
		]},
	]
}

JSON Explanation:

form_title = The title of this form based on the topic
form_description = A short description of this form based on the topic
form_questions = A list of the questions of this form
	- question_str = The question text
	- question_type = The question type (Multiple Choice = MC, Checkboxes = CH, Dropdown = DR, Long Paragraph Answers = LA)
	- answer_choices = The choices of answer to the given question
		- choice = An answer choice

Output ONLY WITH JSON. No other text is needed. Your JSON Response:`;

  instruction = instruction.toString().replace('{qNum}', qNum.toString());
  instruction = instruction.toString().replace('{topic}', topic.toString());
  instruction = instruction.toString().replace('{cNum}', cNum.toString());
  instruction = instruction.toString().replace('{extra}', extra.toString());

  return instruction;
}

function openAIComplete(token, topic, extra, qNum, cNum) {
  try {
    var prompt = instructText(topic, extra, qNum, cNum);

    var payload = {
      'model': 'text-davinci-003',
      'prompt': prompt.toString(),
      'temperature': 0.2,
      'max_tokens': 3500,
      'top_p': 1,
      'frequency_penalty': 0,
      'presence_penalty': 0
    }

    var headers = {
      'Authorization': 'Bearer ' + token.toString()
    }

    var options = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': headers,
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true,
    };

    var url = 'https://api.openai.com/v1/completions';
    var response = UrlFetchApp.fetch(url, options);
    
    var code = response.getResponseCode();
    var body = response.getContentText();

    if (code == 200) {
      var jsonData = JSON.parse(body);
      var jsonForm = JSON.parse(jsonData['choices'][0]['text'])
      return jsonForm;
    }
    
    return {}
  } catch (e) {
    Logger.log(e.error);
    return {}
  }
}

function generateFormData(token, topic, extra, qNum, cNum, titleChange) {
  try {

    var form = FormApp.getActiveForm();
    var formJSON = openAIComplete(token, topic, extra, qNum, cNum);

    if (titleChange) {
      form.setTitle(formJSON['form_title']).setDescription(formJSON['form_description']);
    }

    for (var idx in formJSON['form_questions']) {
      var currentQuestion = formJSON['form_questions'][idx];

      if (currentQuestion['question_type'] == 'MC') {
        var item = form.addMultipleChoiceItem();
        item.setTitle(currentQuestion['question_str']);
        item.setChoices(currentQuestion['answer_choices'].map(function (answer) {
          return item.createChoice(answer['choice'])
        }));
      }

      if (currentQuestion['question_type'] == 'CH') {
        var item = form.addCheckboxItem();
        item.setTitle(currentQuestion['question_str']);
        item.setChoices(currentQuestion['answer_choices'].map(function (answer) {
          return item.createChoice(answer['choice'])
        }));
      }

      if (currentQuestion['question_type'] == 'DR') {
        var item = form.addCheckboxItem();
        item.setTitle(currentQuestion['question_str']);
        item.setChoices(currentQuestion['answer_choices'].map(function (answer) {
          return item.createChoice(answer['choice'])
        }));
      }

      if (currentQuestion['question_type'] == 'LA') {
        var item = form.addTextItem();
        item.setTitle(currentQuestion['question_str']);
      }
    }
  } catch (e) {
    Logger.log('Error [generateFormData]' + e.error);
  }
}