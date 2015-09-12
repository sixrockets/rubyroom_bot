import lodash, { reduceRight } from "lodash";
import { post } from 'request';
import { parseString } from 'xml2js';

export default class LTBot {
  constructor() {
    this.name = "LTBot";
  }

  replacer(result, other) {
    return result.substring(0, other.offset) +
      other.repl +
      result.substring(other.offset +
      other.errorlength, result.length);
  }

  onMessage (message, responder){
    post({ url: 'https://languagetool.org:8081', form: { 'language': 'es', 'text': message.text } },
      (error, response, body) => {
        parseString(body, (err, result) => {
          if(!result) return

          result = lodash(result.matches.error).
            map(obj => ({
              rule: obj.$.ruleId,
              repl: obj.$.replacements.split("#")[0],
              offset: parseInt(obj.$.offset, 10),
              errorlength: parseInt(obj.$.errorlength, 10),
            })).
            filter('rule', 'MORFOLOGIK_RULE_ES').
            value()

          if (result.length > 0)
            responder(reduceRight(result, this.replacer, message.text) + "*");
        })
    });
  }
}