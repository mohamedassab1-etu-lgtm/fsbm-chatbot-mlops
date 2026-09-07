import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { WelcomeScreen } from '../../website/src/components/chat/WelcomeScreen'

describe('WelcomeScreen Component', () => {
  it('mounts and renders successfully', () => {
    // Pass the required props to satisfy the component's TypeScript definition
    const { container } = render(<WelcomeScreen status="authenticated" userName="Test User" />)
    expect(container.hasChildNodes()).toBe(true)
  })
})