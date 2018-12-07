import React, { Component } from 'react'
import Button from '@components/Button';
import Checkbox from '@components/layouts/Checkbox'
import { YouTubeContext } from '@stores/YouTubeContext';
import { trySearch } from '@utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck'
import { Redirect } from 'react-router'

export class ListSearches extends Component {

  constructor() {
    super();

    this.state = {
      redirectTo: null
    }
  }

  componentDidUpdate() {
    if (this.state.redirectTo) return this.setState({ redirectTo: null })
  }

  handleChange(e, context) {
    e.stopPropagation();
    const id = e.target.id;
    const searchIndex = context.state.searches.findIndex(x => x.id == id);
    const searches = context.state.searches;
    searches[searchIndex].selected = e.target.checked;
    return context.setState('searches', searches);
  }

  async redirectSearch(search, context) {
    await context.setState('search', '"'+search.value+'"')
    return this.setState({ redirectTo: trySearch(search.value, search.id) })
  }

  handleRemove(context) {
    const searchesSelected = context.state.searches.filter(x => x.selected)
    return context.removeSearch(searchesSelected);
  }

  render() {
    if (this.state.redirectTo) return <Redirect to={this.state.redirectTo} />
    return (
      <YouTubeContext.Consumer>
        {(context) => (
          <div className="box-material table-searches">
            <form>
              <div className="flex-me flex-justify-end">
                <Button disabled={!context.state.searches.find(x => x.selected)} onClick={() => this.handleRemove(context)}>Remove</Button>
              </div>
              <table className="table-material">
                <thead>
                  <tr>
                    <th>
                      <Checkbox
                        checked={context.state.searches.filter(x => x.selected).length === context.state.searches.length}
                        onChange={() => context.selectAll('searches')}
                      />
                    </th>
                    <th>#</th>
                    <th>Value</th>
                    <th>Template</th>
                    <th>AS</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {
                    context.state.searches.map((elem, index) =>
                      <tr key={elem.id}>
                        <th>
                          <Checkbox
                            checked={elem.selected}
                            id={elem.id}
                            value={elem.id}
                            name="select_search"
                            checked={elem.selected}
                            onChange={e => this.handleChange(e, context)}
                          />
                        </th>
                        <th scope="row">{index}</th>
                        <td>{elem.value}</td>
                        <td>{elem.getTemplate(context).title}</td>
                        <td>{elem.autoSelect && <FontAwesomeIcon icon={faCheck} size="1x" fixedWidth />}</td>
                        <td>
                          <Button onClick={() => this.redirectSearch(elem, context)}>Go</Button>
                        </td>
                      </tr>
                    )
                  }
                </tbody>
              </table>
            </form>
          </div>
        )}
      </YouTubeContext.Consumer>
    )
  }
}

export default ListSearches
