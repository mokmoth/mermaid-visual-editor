import { describe, expect, it } from 'vitest'
import {
  COMPACT_DEFAULT_CODE,
  COMPACT_DEFAULT_PROPS,
  COMPACT_MIN_CODE,
  COMPACT_MIN_PREVIEW,
  COMPACT_MIN_PROPS,
  clampPanelHeights
} from './usePanelHeights'

describe('clampPanelHeights', () => {
  it('keeps desktop limits when not compact', () => {
    const r = clampPanelHeights({
      containerHeight: 900,
      compact: false,
      propertiesHeight: 280,
      codeHeight: 200
    })
    expect(r.propsH).toBe(280)
    expect(r.codeH).toBe(200)
    expect(r.minProps).toBe(150)
    expect(r.maxProps).toBe(500)
  })

  it('lets phone panes shrink to a header so preview can take the rest', () => {
    const r = clampPanelHeights({
      containerHeight: 572,
      compact: true,
      propertiesHeight: COMPACT_MIN_PROPS,
      codeHeight: COMPACT_MIN_CODE
    })
    expect(r.propsH).toBe(COMPACT_MIN_PROPS)
    expect(r.codeH).toBe(COMPACT_MIN_CODE)
    const leftover = 572 - r.propsH - r.codeH
    expect(leftover).toBeGreaterThan(COMPACT_MIN_PREVIEW)
  })

  it('does not let desktop-sized defaults crush the phone preview', () => {
    const r = clampPanelHeights({
      containerHeight: 572,
      compact: true,
      propertiesHeight: 280,
      codeHeight: 200
    })
    expect(r.propsH + r.codeH).toBeLessThanOrEqual(572 - COMPACT_MIN_PREVIEW)
    expect(572 - r.propsH - r.codeH).toBeGreaterThanOrEqual(COMPACT_MIN_PREVIEW)
  })

  it('compact defaults leave a usable preview on a 390-class drawer', () => {
    const r = clampPanelHeights({
      containerHeight: 572,
      compact: true,
      propertiesHeight: COMPACT_DEFAULT_PROPS,
      codeHeight: COMPACT_DEFAULT_CODE
    })
    expect(r.propsH).toBe(COMPACT_DEFAULT_PROPS)
    expect(r.codeH).toBe(COMPACT_DEFAULT_CODE)
    expect(572 - r.propsH - r.codeH).toBeGreaterThan(280)
  })

  it('can give almost the whole drawer to code by shrinking the other panes', () => {
    const r = clampPanelHeights({
      containerHeight: 572,
      compact: true,
      propertiesHeight: 44,
      codeHeight: 400
    })
    expect(r.propsH).toBe(COMPACT_MIN_PROPS)
    expect(r.codeH).toBeGreaterThan(300)
  })
})
