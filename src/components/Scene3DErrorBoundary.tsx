import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onClose?: () => void;
}

export class Scene3DErrorBoundary extends Component<Props, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(err: Error) { console.error('[Scene3D] asset load error:', err.message); }
  render() {
    if (this.state.crashed) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
          <div className="text-center px-8">
            <div className="text-5xl mb-4 opacity-30">💎</div>
            <p className="text-sm font-semibold text-gray-600 mb-1">3D preview unavailable</p>
            <p className="text-xs text-gray-400 mb-4">An asset failed to load</p>
            {this.props.onClose ? (
              <button
                onClick={this.props.onClose}
                className="text-xs px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Close AR
              </button>
            ) : (
              <button
                onClick={() => this.setState({ crashed: false })}
                className="text-xs px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
