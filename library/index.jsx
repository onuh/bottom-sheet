//
// Copyright (c) 2022-2023 Ivan Teplov
// Licensed under the Apache license 2.0
//

/** @jsx createElement */

import { createElement } from "./createElement"
import "./sheet.css"

/**
 * Check if the element is focused
 * @param {HTMLElement}
 */
const isFocused = element => document.activeElement === element

/**
 * Get object that contains touch position (depending on event type)
 * @param {MouseEvent|TouchEvent} event
 * @returns {MouseEvent|Touch}
 */
const touchPosition = (event) =>
  event.touches ? event.touches[0] : event

export class BottomSheet {
  /**
   * Height of the sheet in viewport height units (vh)
   * @type {number}
   */
  #height = 0

  /**
   * DOM identifier of the sheet
   * @type {string}
   */
  #identifier

  /**
   * Body of the sheet (specified in the constructor)
   * @type {HTMLElement}
   */
  #contents

  /**
   * Wrapper of the sheet
   * @type {HTMLElement|null}
   */
  #wrapper = null

  /**
   * The sheet itself
   * @type {HTMLElement|null}
   */
  #sheet = null

  /**
   * Gray area on the top of the sheet to resize the sheet
   * @type {HTMLElement}
   */
  #draggableArea

  /** Just methods with 'this' binded */
  #eventListeners = {
    onDragMove: this.#onDragMove.bind(this),
    onDragStart: this.#onDragStart.bind(this),
    onDragEnd: this.#onDragEnd.bind(this),
    onKeyUp: this.#onKeyUp.bind(this),
    onCloseButtonClick: this.#onCloseButtonClick.bind(this),
    onOverlayClick: this.#onOverlayClick.bind(this)
  }

  /**
   * @param {string} identifier
   * @param {HTMLElement} contents
   * @param {object} options
   * @param {boolean?} options.closeOnBackgroundClick
   * @param {boolean?} options.closeOnEscapeKey
   */
  constructor(identifier, contents, options = {}) {
    this.#identifier = identifier
    this.#contents = contents

    this.options = {
      closeOnBackgroundClick: true,
      closeOnEscapeKey: true,
      ...options
    }
  }

  get html() {
    if (!this.#wrapper) {
      this.#renderHTML(this.#contents)
    }

    return this.#wrapper
  }

  get id() {
    return this.#identifier
  }

  get identifier() {
    return this.#identifier
  }

  #validateParameters() {
    if (typeof this.#identifier !== "string") {
      throw new TypeError(`Identifier is not specified`)
    }

    if (document.getElementById(this.#identifier) !== null) {
      throw new TypeError(`The provided identifier is already in use`)
    }

    if (this.#contents?.parentElement !== null) {
      throw new Error("The contents of the bottom sheet should not be already mounted into the Document Object Model (DOM)")
    }
  }

  /**
   * Method to hide or show the sheet
   * @param {boolean} isShown
   */
  setIsShown(isShown) {
    this.#wrapper.setAttribute("aria-hidden", String(!isShown))

    if (!isShown) {
      this.setHeight(0)
    } else {
      this.setHeight(50)
    }
  }

  /**
   * @param {number} value - height in vh (viewport height)
   */
  setHeight(value) {
    if (typeof value !== "number") return

    this.#height = Math.max(0, Math.min(100, value))
    this.#sheet.style.height = `${this.#height}vh`

    if (this.#height === 100) {
      this.#sheet.classList.add("fullscreen")
    } else {
      this.#sheet.classList.remove("fullscreen")
    }
  }

  // Hide the sheet when clicking at the background
  #onOverlayClick() {
    if (this.options.closeOnBackgroundClick) {
      this.setIsShown(false)
    }
  }

  // Hide the sheet when clicking at the 'close' button
  #onCloseButtonClick() {
    this.setIsShown(false)
  }

  /**
   * Hide the sheet when pressing Escape if the target element is not an input field
   * @param {KeyboardEvent} event
   */
  #onKeyUp(event) {
    if (!this.#sheet) {
      return this.#removeWindowEventListeners()
    }

    const isSheetElementFocused =
      this.#wrapper.contains(event.target) && isFocused(event.target)

    if (event.key === "Escape" && !isSheetElementFocused && this.options.closeOnEscapeKey) {
      this.setIsShown(false)
    }
  }

  #dragPosition

  /**
   * @param {MouseEvent|TouchEvent} event
   */
  #onDragStart(event) {
    if (!this.#sheet) {
      return this.#removeWindowEventListeners()
    }

    this.#dragPosition = touchPosition(event).pageY
    this.#sheet.classList.add("not-selectable")
    this.#draggableArea.style.cursor = document.body.style.cursor = "grabbing"
  }

  /**
   * @param {MouseEvent|TouchEvent} event
   */
  #onDragMove(event) {
    if (!this.#sheet) {
      return this.#removeWindowEventListeners()
    }

    if (this.#dragPosition === undefined) return

    const y = touchPosition(event).pageY
    const deltaY = this.#dragPosition - y
    const deltaHeight = deltaY / window.innerHeight * 100

    this.setHeight(this.#height + deltaHeight)
    this.#dragPosition = y
  }

  /**
   * @param {MouseEvent|TouchEvent} _event
   */
  #onDragEnd(_event) {
    if (!this.#sheet) {
      return this.#removeWindowEventListeners()
    }

    this.#dragPosition = undefined
    this.#sheet.classList.remove("not-selectable")
    this.#draggableArea.style.cursor = document.body.style.cursor = ""

    if (this.#height < 25) {
      this.setIsShown(false)
    } else if (this.#height > 75) {
      this.setHeight(100)
    } else {
      this.setHeight(50)
    }
  }

  /**
   * @param {HTMLElement} bodyContents
   */
  #renderHTML(bodyContents) {
    this.#validateParameters()

    this.#wrapper = (
      <div class="bottom-sheet-wrapper" id={this.#identifier} role="dialog" aria-hidden="true">
        <div class="bottom-sheet-overlay" onClick={this.#eventListeners.onOverlayClick}></div>
        <div class="bottom-sheet" reference={sheet => this.#sheet = sheet}>
          <header class="bottom-sheet-controls">
            <div
              class="bottom-sheet-draggable-area"
              reference={area => this.#draggableArea = area}
              onMouseDown={this.#eventListeners.onDragStart}
              onTouchStart={this.#eventListeners.onDragStart}
            >
              <div class="bottom-sheet-draggable-thumb"></div>
            </div>

            <button
              type="button"
              aria-controls={this.#identifier}
              class="bottom-sheet-close-button"
              onClick={this.#eventListeners.onCloseButtonClick}
              title="Close the sheet"
            >
              &times;
            </button>
          </header>
          <main class="bottom-sheet-body">
            {bodyContents}
          </main>
        </div>
      </div>
    )

    window.addEventListener("keyup", this.#eventListeners.onKeyUp)

    window.addEventListener("mousemove", this.#eventListeners.onDragMove)
    window.addEventListener("touchmove", this.#eventListeners.onDragMove)

    window.addEventListener("mouseup", this.#eventListeners.onDragEnd)
    window.addEventListener("touchend", this.#eventListeners.onDragEnd)
  }

  #removeWindowEventListeners() {
    window.removeEventListener("keyup", this.#eventListeners.onKeyUp)

    window.removeEventListener("mousemove", this.#eventListeners.onDragMove)
    window.removeEventListener("touchmove", this.#eventListeners.onDragMove)

    window.removeEventListener("mouseup", this.#eventListeners.onDragEnd)
    window.removeEventListener("touchend", this.#eventListeners.onDragEnd)
  }
}
