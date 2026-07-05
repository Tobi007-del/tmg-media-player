import { BaseComponent, ComponentState } from "../base";

export abstract class BaseNotifier<Config = any, State extends ComponentState = any, El extends HTMLElement = HTMLElement> extends BaseComponent<Config, State, El> {
  public static readonly componentName: string = "base";
  public static readonly isNotifier: boolean = true;
  public static readonly triggers: string[] = [];
  public nodes: El[] = [];
  protected get plug() {
    return this.ctlr.plug("settings.notifiers");
  }
  public get events() {
    return (this.constructor as typeof BaseNotifier).triggers;
  }

  public override mount() {
    const nodes = this.nodes.length ? this.nodes : [this.element];
    for (const node of nodes) node.classList.add("tmg-media-notifier");
    this.ctlr.DOM.notifiersContainer?.append(...nodes);
  }
  public override unmount(): void {
    for (const node of this.nodes.length ? this.nodes : [this.element]) node.remove();
  }

  public override wire(): void {
    // Event Listeners
    for (const node of this.nodes.length ? this.nodes : [this.element]) node.addEventListener("animationend", this.handleAnimationEnd, { signal: this.signal });
    // Post Wiring
    this.plug?.state.events.push(...this.events);
  }
  
  protected handleAnimationEnd(): void {
    this.plug?.reset("", true);
  }

  protected bindNodes(nodes: El[]): El {
    return (this.nodes = nodes), (this.element = nodes[0]);
  }
}

export type { ComponentState };
