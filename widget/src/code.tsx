/// <reference path="../../declaration/types.d.ts" />
// This widget will open an Iframe window with buttons to show a toast message and close the window.

const { widget } = figma;
const { useEffect, Text, Frame, AutoLayout, useSyncedState, usePropertyMenu } =
  widget;

const PLACEHOLDER = "rgb(128, 128, 128)";
const FONT_FAMILY = "Source Code Pro";
const PLACEHOLDER_TEXT = "Type code...";

interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

function placeholderTokens(
  placeholderText: string,
  language?: string
): Message {
  const tokens: Token[] = [];
  let x = 0;
  let y = 0;
  let width = 0;
  for (let i = 0; i < placeholderText.length; i++) {
    const text = placeholderText.charAt(i);

    tokens.push({
      i,
      x,
      y,
      text,
      style: {
        color: PLACEHOLDER,
        weight: "normal",
      },
    });

    if (text === "\n") {
      x = 0;
      y++;
    } else {
      x++;
      if (x > width) {
        width = x;
      }
    }
  }

  const height = y + 1;
  return {
    type: "text",
    width,
    height,
    text: placeholderText,
    tokens,
    language: language == null ? "JavaScript" : language,
  };
}

function ensureFontWeight(
  weight: string
):
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900
  | "thin"
  | "extra-light"
  | "light"
  | "normal"
  | "medium"
  | "semi-bold"
  | "bold"
  | "extra-bold"
  | "black" {
  if (weight.trim().length === 0) {
    return "normal";
  }
  const weightInt = parseInt(weight);
  if (weightInt % 100 === 0 && weightInt > 0 && weightInt < 1000) {
    return weightInt as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  }

  const normalizedWeight = weight.toLowerCase().trim();

  if (normalizedWeight === "thin") return "thin";
  if (normalizedWeight === "extra-light") return "extra-light";
  if (normalizedWeight === "light") return "light";
  if (normalizedWeight === "normal") return "normal";
  if (normalizedWeight === "medium") return "medium";
  if (normalizedWeight === "semi-bold") return "semi-bold";
  if (normalizedWeight === "bold") return "bold";
  if (normalizedWeight === "extra-bold") return "extra-bold";
  if (normalizedWeight === "black") return "black";
  return "normal";
}

function getFill(style: string): Color {
  const defaultColor = {
    r: 0,
    g: 0,
    b: 0,
    a: 1,
  };

  try {
    if (style.startsWith("rgb")) {
      const numbers = style
        .split(/[^0-9]+/)
        .filter((x) => x.trim().length > 0)
        .map((x) => parseInt(x));
      if (numbers.length >= 3) {
        return {
          r: numbers[0] / 255,
          g: numbers[1] / 255,
          b: numbers[2] / 255,
          a: numbers.length >= 4 ? numbers[3] : 1,
        };
      }
    }
    return defaultColor;
  } catch (e) {
    return defaultColor;
  }
}

const SIZES = [10, 12, 14, 16, 18, 20, 24, 32, 36, 40, 48, 64, 96, 128];

function fillMode(color: Color, mode: string): Color {
  if (mode === "light") return color;
  return {
    r: 1 - color.r,
    g: 1 - color.g,
    b: 1 - color.b,
    a: color.a,
  };
}

function Widget() {
  const [tokens, setTokens] = useSyncedState(
    "text",
    placeholderTokens(PLACEHOLDER_TEXT)
  );

  const [FONT_SIZE, setFontSize] = useSyncedState("fontSize", 24);
  const [colorMode, setColorMode] = useSyncedState("colorMode", "light");
  const [includeFrame, setIncludeFrame] = useSyncedState("includeFrame", true);
  const LETTER_WIDTH = (FONT_SIZE / 24) * 15;
  const LETTER_HEIGHT = (FONT_SIZE / 24) * 30;
  const PADDING = (FONT_SIZE / 24) * 10;
  const CORNER_RADIUS = (FONT_SIZE / 24) * 8;
  const BACKGROUND = colorMode === "light" ? "#FFFFFF" : "#343434";

  usePropertyMenu(
    [
      {
        itemType: "dropdown",
        selectedOption: `${includeFrame}`,
        tooltip: "Frame code",
        propertyName: "includeFrame",
        options: [
          { label: "Framed", option: "true" },
          { label: "Unframed", option: "false" },
        ],
      },
      {
        itemType: "dropdown",
        selectedOption: colorMode,
        tooltip: "Color mode",
        propertyName: "colorMode",
        options: [
          { label: "Light mode", option: "light" },
          { label: "Dark mode", option: "dark" },
        ],
      },
      {
        itemType: "dropdown",
        selectedOption: `${FONT_SIZE}`,
        tooltip: "Font size",
        propertyName: "fontSize",
        options: SIZES.map((size) => ({
          label: `${size}`,
          option: `${size}`,
        })),
      },
    ],
    (e) => {
      if (e.propertyName === "includeFrame") {
        setIncludeFrame(e.propertyValue === "true");
      }
      if (e.propertyName === "colorMode") {
        setColorMode(e.propertyValue);
      }
      if (e.propertyName === "fontSize") {
        setFontSize(parseInt(e.propertyValue));
      }
    }
  );

  useEffect(() => {
    figma.ui.onmessage = (msg: Message) => {
      if (msg.type === "text") {
        console.log("GOT", msg);
        if (msg.text === "") {
          setTokens(placeholderTokens(PLACEHOLDER_TEXT, msg.language));
        } else {
          setTokens(msg);
        }
      }
    };
  });

  const component = (
    <Frame
      width={tokens.width * LETTER_WIDTH}
      height={tokens.height * LETTER_HEIGHT}
      onClick={
        // Use async callbacks or return a promise to keep the Iframe window
        // opened. Resolving the promise, closing the Iframe window, or calling
        // "figma.closePlugin()" will terminate the code.
        () =>
          new Promise((resolve) => {
            console.log("TOKENS", tokens);
            const injectedHtml = __html__
              .replace(
                /['"]\$\$\$INITIAL_DOC\$\$\$['"]/,
                JSON.stringify(tokens.text)
              )
              .replace(
                /['"]\$\$\$INITIAL_LANGUAGE\$\$\$['"]/,
                JSON.stringify(tokens.language)
              );

            figma.showUI(injectedHtml, { width: 500, height: 300 });
          })
      }
    >
      {tokens.tokens.map((token) => {
        return (
          <Text
            fontFamily={FONT_FAMILY}
            fontSize={FONT_SIZE}
            x={token.x * LETTER_WIDTH}
            y={token.y * LETTER_HEIGHT}
            fill={fillMode(getFill(token.style.color), colorMode)}
            fontWeight={ensureFontWeight(token.style.weight)}
            key={JSON.stringify(token)}
          >
            {token.text}
          </Text>
        );
      })}
    </Frame>
  );

  if (includeFrame) {
    return (
      <AutoLayout
        direction="horizontal"
        padding={PADDING}
        cornerRadius={CORNER_RADIUS}
        fill={BACKGROUND}
        effect={{
          type: "drop-shadow",
          blur: (15 / 40) * FONT_SIZE,
          offset: {
            x: 0,
            y: (3 / 40) * FONT_SIZE,
          },
          color: {
            r: 0,
            g: 0,
            b: 0,
            a: 0.13,
          },
        }}
      >
        {component}
      </AutoLayout>
    );
  } else {
    return component;
  }
}

widget.register(Widget);
