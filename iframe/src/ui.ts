/// <reference path="../../declaration/types.d.ts" />
import { EditorView, ViewUpdate, keymap } from "@codemirror/view";
import { EditorState, StateEffect } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { indentWithTab } from "@codemirror/commands";
import {
  defaultHighlightStyle,
  LanguageSupport,
  ensureSyntaxTree,
} from "@codemirror/language";
import { highlightTree } from "@lezer/highlight";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { cpp } from "@codemirror/lang-cpp";
import { markdown } from "@codemirror/lang-markdown";
import { xml } from "@codemirror/lang-xml";
import { rust } from "@codemirror/lang-rust";
import { sql } from "@codemirror/lang-sql";
import { css } from "@codemirror/lang-css";
import { python } from "@codemirror/lang-python";
import { php } from "@codemirror/lang-php";
import { json } from "@codemirror/lang-json";
import { java } from "@codemirror/lang-java";
import { csharp } from "@replit/codemirror-lang-csharp"

// Replaced by the widget to inject state
const INITIAL_DOC = "";
const INITIAL_LANGUAGE = "JavaScript";

// The mapping from languages to CodeMirror packages
interface ILanguage {
  name: string;
  package: () => LanguageSupport
};

const LANGUAGES = [
  {
    name: "JavaScript",
    package: () => javascript({ jsx: true, typescript: true }),
  },
  {
    name: "HTML",
    package: () => html(),
  },
  {
    name: "C++",
    package: () => cpp(),
  },
  {
    name: "Markdown",
    package: () => markdown(),
  },
  {
    name: "XML",
    package: () => xml(),
  },
  {
    name: "Rust",
    package: () => rust(),
  },
  {
    name: "SQL",
    package: () => sql(),
  },
  {
    name: "CSS",
    package: () => css(),
  },
  {
    name: "C#",
    package: () => csharp()
  },
  {
    name: "Python",
    package: () => python(),
  },
  {
    name: "PHP",
    package: () => php(),
  },
  {
    name: "JSON",
    package: () => json(),
  },
  {
    name: "Java",
    package: () => java(),
  },
] as ILanguage[];

// Initialize the language
const languageObject = LANGUAGES.filter(
  (x) => x.name === "$$$INITIAL_LANGUAGE$$$"
)[0]; // INITIAL_LANGUAGE replaced by the widget to inject state
const language = languageObject.package();
const languageName = languageObject.name;

// Create the language dropdown
const dropdown = document.createElement("select");
// Style the dropdown
dropdown.style.background = "#444444";
dropdown.style.color = "white";
dropdown.style.fontFamily = "monospace";
dropdown.style.padding = "2px";
dropdown.style.fontSize = "12px";
dropdown.style.width = "100%";
dropdown.style.border = "none";

// Populate the dropdown options with languages
for (const { name } of LANGUAGES) {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  dropdown.appendChild(option);
}
dropdown.value = languageObject.name;
document.body.appendChild(dropdown);

// The default style for output tokens
const DEFAULT_STYLE: Style = {
  color: "",
  weight: "",
};

/**
 * Gets the CodeMirror editor extension configuration for the given languages
 * @param language The CodeMirror language package
 * @param languageName The name of the language package (see {@link LANGUAGES})
 * @returns CodeMirror extensions to power the editor
 */
function getExtensions(language: LanguageSupport, languageName: string) {
  // Cached styles
  const STYLE_CACHE: { [style: string]: Style } = {};

  /**
   * Gets the style given a CodeMirror highlight class
   * @param className The CodeMirror class name
   * @returns A style object with computed styles based on the iframe DOM
   */
  function getStyle(className: string): Style {
    // Check if the style is cached to avoid unnecessary computation
    if (STYLE_CACHE[className] != null) {
      return STYLE_CACHE[className];
    }

    // Create a temporary element
    const tmpElem = document.createElement("div");
    tmpElem.className = className;
    document.body.appendChild(tmpElem);
    // Update the cache with the computed style
    const computed = getComputedStyle(tmpElem);
    STYLE_CACHE[className] = {
      color: computed.color,
      weight: computed.fontWeight,
    };
    document.body.removeChild(tmpElem);

    // Return getStyle, which will retrieve from cache now
    return getStyle(className);
  }

  return [
    // Essential setup
    [basicSetup, keymap.of([indentWithTab]), language],
    // Update function
    EditorView.updateListener.of((v: ViewUpdate) => {
      if (
        v.docChanged ||
        (v.transactions.length > 0 &&
          v.transactions.some((transaction) => transaction.reconfigured))
      ) {
        // Document changed
        const docContents = v.state.doc.toString();

        // Build up the highlighting syntax tree
        const highlighting: [number, number, string][] = [];
        highlightTree(
          ensureSyntaxTree(
            editor.state,
            v.state.doc.length,
            (() => false) as unknown as number
          ),
          defaultHighlightStyle,
          (from, to, classes) => highlighting.push([from, to, classes])
        );

        // Populate all the tokens with x/y positions,
        // calculate width/height while processing
        const tokens: Token[] = [];
        let x = 0;
        let y = 0;
        let width = 0;
        for (let i = 0; i < docContents.length; i++) {
          const text = docContents.charAt(i);
          tokens.push({ i, x, y, text, style: DEFAULT_STYLE });
          if (text === "\n") {
            // Line feed, advance newline
            x = 0;
            y++;
          } else {
            // Advance character
            x++;
            if (x > width) {
              // Note new max width
              width = x;
            }
          }
        }

        // Add one more line to the height
        const height = y + 1;

        // Color in tokens
        for (const highlight of highlighting) {
          for (let i = highlight[0]; i < highlight[1]; i++) {
            tokens[i].style = getStyle(highlight[2]);
          }
        }

        // Group tokens
        const newTokens: Token[] = [];
        let prevToken: Token | null = null;
        let currentRun: Token[] = [];

        const flushTokens = () => {
          if (currentRun.length > 0) {
            // Flush out current tokens
            const firstToken = currentRun[0];
            let combinedTokenText = "";
            for (const token of currentRun) {
              combinedTokenText += token.text;
            }
            newTokens.push({
              i: firstToken.i,
              x: firstToken.x,
              y: firstToken.y,
              style: firstToken.style,
              text: combinedTokenText,
            });
            // Set current run
            currentRun = [];
          }
        };

        for (const token of tokens) {
          if (token.text === "\n") {
            // Newline token always ends the current run
            flushTokens();
          } else {
            // Check the previous token
            if (prevToken != null) {
              if (
                prevToken.style.color !== token.style.color ||
                prevToken.style.weight !== token.style.weight
              ) {
                // If the tokens don't match, flush the current run
                flushTokens();
              }
            }
            // No matter what, increment the current run
            currentRun.push(token);
          }

          // Set the previous token
          prevToken = token;
        }
        // Flush any remaining tokens
        flushTokens();

        // The message to pass back to the widget
        const message: Message = {
          type: "text",
          width,
          height,
          text: docContents,
          tokens: newTokens,
          language: languageName,
        };

        // Pass the message back to the widget
        parent.postMessage(
          {
            pluginMessage: message,
          },
          "*"
        );
      }
    }),
  ];
}

// Create the CodeMirror editor
const editor = new EditorView({
  state: EditorState.create({
    doc: "$$$INITIAL_DOC$$$", // INITIAL_DOC replaced by the widget to inject state
    extensions: getExtensions(language, languageName),
  }),
  parent: document.body,
});

// Listen to dropdown change events and update the editor with a new extension
// configuration based on the selected language
dropdown.addEventListener("change", (e) => {
  // Grab the language name and package
  const languageName = (e.target as HTMLSelectElement).value;
  const languagePackage = LANGUAGES.filter((x) => x.name === languageName)[0]
    .package;
  // Update the editor
  editor.dispatch({
    effects: StateEffect.reconfigure.of(
      getExtensions(languagePackage(), languageName)
    ),
  });
});
