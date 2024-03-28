import "./style.css";
import "jspsych/css/jspsych.css";
import opponentNeutral from "./images/opponent/neutral.png";
import opponentBlock from "./images/opponent/block.png";
import opponentHit1 from "./images/opponent/hit1.png";
import opponentHit2 from "./images/opponent/hit2.png";
import opponentJab from "./images/opponent/strike1.png";
import opponentCross from "./images/opponent/strike2.png";
import opponentWindup from "./images/opponent/windup.png";
import playerNeutral from "./images/player/neutral.png";
import playerBlock from "./images/player/block.png";
import playerHit from "./images/player/hit.png";
import playerJab from "./images/player/jab.png";
import playerCross from "./images/player/cross.png";
import { initJsPsych } from "jspsych";
import jsPsychHTMLKeyboardResponse from "@jspsych/plugin-html-keyboard-response";
import jsPsychPreload from "@jspsych/plugin-preload";

interface JsPsychTrial {
  trial_type: string;
  trial_index: number;
  time_elapsed: number;
  internal_node_id: string;
  rt: number;
  response: string;
  stimulus: string;
}

const agentStates = [
  "neutral",
  "block",
  "windup",
  "hit1",
  "hit2",
  "combo",
  "combo2",
] as const;
type AgentState = (typeof agentStates)[number];

const possibleActions = ["none", "jab", "cross", "block"] as const;
type Action = (typeof possibleActions)[number];

type GameState = {
  player: AgentState;
  opponent: AgentState;
};

interface Trial extends JsPsychTrial {
  round: number;
  action: Action;
  state: GameState;
  nextState: GameState;
}

function sampleOne<T>(a: T[]): T {
  return jsPsych.randomization.sampleWithoutReplacement(a, 1)[0];
}

function getPrevTrial(): Trial {
  return jsPsych.data.get().last(1).values()[0] as Trial;
}

function isTerminalState(state: GameState) {
  return state.player === "combo2" || state.opponent === "combo2";
}

function opponentImage(state: AgentState): string {
  switch (state) {
    case "neutral":
      return opponentNeutral;
    case "block":
      return opponentBlock;
    case "windup":
      return opponentWindup;
    case "hit1":
      return opponentHit1;
    case "hit2":
      return opponentHit2;
    case "combo":
      return opponentJab;
    case "combo2":
      return opponentCross;
  }
}

function playerImage(state: AgentState): string {
  switch (state) {
    case "neutral":
      return playerNeutral;
    case "block":
      return playerBlock;
    case "windup":
      return "";
    case "hit1":
      return playerHit;
    case "hit2":
      return playerHit;
    case "combo":
      return playerJab;
    case "combo2":
      return playerCross;
  }
}

function transition(
  playerState: AgentState,
  opponentState: AgentState,
  action: Action,
): [AgentState, AgentState] {
  switch ([playerState, opponentState, action].join()) {
    case ["neutral", "neutral", "none"].join():
      return sampleOne([
        ["neutral", "block"],
        ["neutral", "windup"],
      ]);
    case ["neutral", "neutral", "jab"].join():
      return sampleOne([
        ["combo", "block"],
        ["combo", "hit1"],
      ]);
    case ["neutral", "neutral", "cross"].join():
      return sampleOne([
        ["combo2", "hit2"],
        ["hit1", "combo"],
      ]);
    case ["neutral", "neutral", "block"].join():
      return sampleOne([
        ["block", "block"],
        ["block", "windup"],
      ]);
    case ["neutral", "block", "none"].join():
      return sampleOne([
        ["neutral", "neutral"],
        ["neutral", "windup"],
      ]);
    case ["neutral", "block", "jab"].join():
      return ["combo", "block"];
    case ["neutral", "block", "cross"].join():
      return ["combo2", "block"];
    case ["neutral", "block", "block"].join():
      return ["neutral", "neutral"];
    case ["neutral", "windup", "none"].join():
      return ["hit1", "combo"];
    case ["neutral", "windup", "cross"].join():
      return ["hit1", "combo"];
    case ["neutral", "windup", "jab"].join():
      return sampleOne([
        ["combo", "hit1"],
        ["hit1", "combo"],
      ]);
    case ["neutral", "windup", "block"].join():
      return sampleOne([
        ["block", "combo"],
        ["block", "combo2"],
      ]);
    case ["combo", "block", "block"].join():
      return ["block", "combo"];
    case ["combo", "block", "jab"].join():
      return sampleOne([
        ["combo2", "block"],
        ["hit1", "combo"],
      ]);
    case ["combo", "block", "cross"].join():
      return ["hit1", "combo"];
    case ["combo", "hit1", "cross"].join():
      return ["combo2", "hit2"];
    case ["combo", "hit1", "block"].join():
      return ["block", "neutral"];
    case ["hit", "combo", "none"].join():
      return ["hit2", "combo2"];
    case ["hit", "combo", "jab"].join():
      return ["hit2", "combo2"];
    case ["hit", "combo", "cross"].join():
      return ["hit2", "combo2"];
    case ["hit", "combo", "block"].join():
      return ["block", "combo2"];
    default:
      return ["neutral", "neutral"];
  }
}

function keyToAction(key: string): Action {
  switch (key) {
    case "q":
      return "cross";
    case "w":
      return "block";
    case "e":
      return "jab";
    default:
      return "none";
  }
}

const jsPsych = initJsPsych();
jsPsych.randomization.setSeed("1234");

// Since JSPsych doesn't support dynamic timeline construction,
// we create a trial object for each possible state and use `conditional_function`
// so that only the trial object that corresponds to the current state is shown.
const trials = [];
for (const pState of agentStates) {
  for (const oState of agentStates) {
    const pImage = playerImage(pState);
    const oImage = opponentImage(oState);
    trials.push({
      timeline: [
        {
          data: {
            state: {
              player: pState,
              opponent: oState,
            },
          },
          stimulus: `<div style="display: flex; flex-direction: column; align-items: center; width: 20vw;">
                      <img style="width: 50%;" src="${oImage}"/>
                      <img style="width: 100%;" src="${pImage}"/>
                     </div>`,
        },
      ],
      conditional_function: () => {
        const { player, opponent } = getPrevTrial()?.nextState || {
          player: "neutral",
          opponent: "neutral",
        };
        return player === pState && opponent === oState;
      },
    });
  }
}

const steps = [
  { type: jsPsychPreload, images: agentStates.map(opponentImage) },
  {
    repetitions: 10,
    timeline: [
      {
        timeline: [
          {
            type: jsPsychHTMLKeyboardResponse,
            trial_duration: 500,
            choices: ["q", "e", "w"],
            data: () => {
              return { round: (getPrevTrial()?.round || 0) + 1 };
            },
            on_finish: function(data: Trial) {
              data.action = keyToAction(data.response);
              const [player, opponent] = transition(
                data.state.player,
                data.state.opponent,
                data.action,
              );
              data.nextState = { player, opponent };
            },
            timeline: trials,
          },
        ],
        loop_function: function <T extends { trials: Trial[] }>(data: T) {
          const prevTrial = data.trials[data.trials.length - 1];
          if (isTerminalState(prevTrial.state)) {
            prevTrial.round++;
            return false;
          } else {
            return true;
          }
        },
      },
    ],
  },
];

jsPsych.run(steps).finally(() => jsPsych.data.displayData());
