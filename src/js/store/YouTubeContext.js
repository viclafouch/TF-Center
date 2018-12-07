import React, { Component } from 'react'
import Video from '@shared/models/Video.class';
import Template from '@shared/models/Template.class';
import Search from '@shared/models/Search.class';
import { copyDate } from '@utils/date';
import { sevenLastDays } from '@utils/date';
import { urlsAvailable } from '../config/config';
import { getAllUrlParams, setStateAsync, wait } from '@utils/index';
import { fetchHistory, fetchSearch } from '@shared/api/Deputy';
import { getStorages } from './BrowserStorage';

export const YouTubeContext = React.createContext();

class YouTubeProvider extends Component {

  constructor(props) {
    super(props);

    const { storage, pathname, youtubeDatasDeputy } = this.props

    const lastSevenDaysflagged = sevenLastDays.map(elem => {
      const flaggedFounded = storage.lastSevenDaysflagged.find(x => x.date === elem.date);
      return flaggedFounded ? {
        date: elem.date,
        videos: flaggedFounded.videos
      } : elem
    })

    this.state = { ...youtubeDatasDeputy }

    this.baseHide = {}

    this.state.videosDisplayed = youtubeDatasDeputy.videos
    this.state.hideRemoved = this.baseHide.hideRemoved = false
    this.state.hideReviewed = this.baseHide.hideReviewed = false
    this.state.popupReportingOpened = false
    this.state.theme = storage.theme
    this.state.isFetchingSlow = false
    this.state.displaying = storage.displaying
    this.state.videosToFlag = storage.videosToFlag.map(e => new Video(e))
    this.state.videoWatched = youtubeDatasDeputy.videoWatched
    this.state.lastSevenDaysflagged = lastSevenDaysflagged
    this.state.templates = storage.templates.map(elem => new Template(elem))
    this.state.searches = storage.searches.map(elem => new Search(elem))
    this.state.openModal = { type: null, isOpen: false }

    if (pathname === urlsAvailable[5]) {
      this.state.videosDisplayed = this.state.videosToFlag
      this.state.onToFlag = true
    }
  }

  selectItems(items = [], type, force = false) {
    let itemsDisplayed = [...this.state[type]];

    if (force && itemsDisplayed.filter(x => x.selected).length === itemsDisplayed.length) {
      for (let index = 0; index < itemsDisplayed.length; index++) {
        if (items.find(x => x.id === itemsDisplayed[index].id)) {
          itemsDisplayed[index].selected = false
        }
      }
    } else {
      for (let index = 0; index < itemsDisplayed.length; index++) {
        if (items.find(x => x.id === itemsDisplayed[index].id)) {
          itemsDisplayed[index].selected = force || !itemsDisplayed[index].selected
        }
      }
    }

    this.setState({
      [type]: itemsDisplayed
    });
  }

  openModal(type, isOpen = true) {
    if (isOpen) {
      window.location.hash = `#${type}`
    } else {
      const noHashURL = window.location.href.replace(/#.*$/, '');
      window.history.replaceState('', document.title, noHashURL)
    }
    return this.setState({
      openModal: { type, isOpen }
    });
  }

  actionItem(arrayItems, type, callback) {

    let items = this.state[type];

    for (let index = 0; index < arrayItems.length; index++) {
      const element = arrayItems[index];
      const ItemIndex = items.findIndex(x => x.id === element.id)
      if (ItemIndex >= 0) {
        items = items.filter((e, i) => i !== ItemIndex);
      } else {
        items.unshift(element);
      }
    }

    return chrome.storage.sync.set({
      [type]: items.map(e => ({
        ...e,
        created: copyDate(e.created).toString()
      }))
    }, () => this.setState({
      [type]: items
    }, () => callback && callback()));
  }

  removeVideosToFlag(sendForm = false) {
    const listVideoToFlag = this.state.videosToFlag.filter(e => !e.selected)
    chrome.storage.local.set({
      videosToFlag: listVideoToFlag
    }, () => {
      chrome.runtime.sendMessage({ type: 'updateBadgeText', videosToFlag: listVideoToFlag });
      if (sendForm) {
        document.getElementById('formFlagging').submit();
      } else {
        this.setState({
          videosDisplayed: listVideoToFlag
        })
      }
    })
  }

  async getBrowserDatas() {
    await Promise.all([getStorages('local'), getStorages('sync')])
      .then(async storages => {
        const { videosToFlag, templates, searches, lastSevenDaysflagged: test  } = storages.reduce((a, d) => Object.assign(d, a), {});
        const lastSevenDaysflagged = sevenLastDays.map(elem => {
          const flaggedFounded = test.find(x => x.date === elem.date);
          return flaggedFounded ? {
            date: elem.date,
            videos: flaggedFounded.videos
          } : elem
        })
        await setStateAsync({
          videosToFlag: videosToFlag.map(e => new Video(e)),
          templates: templates.map(elem => new Template(elem)),
          searches: searches.map(elem => new Search(elem)),
          lastSevenDaysflagged
        }, this)
      })
  }

  async getVideos(type, params) {
    try {
      if (type !== 'target') await setStateAsync({ isFetchingSlow: true }, this)
      let videos = []
      if (type === 'history') {
        videos = await fetchHistory(params)
      } else if (type === 'search') {
        videos = await fetchSearch(params)
      } else if (type === 'target') {
        videos = {
          videos: this.state.videosToFlag,
          pagination: []
        }
      }
      await setStateAsync({
        ...videos,
        videosDisplayed: videos.videos,
        onToFlag: type === 'target'
      }, this)
      await wait(0)
    } catch (error) {
      throw new Error(error)
    } finally {
      await setStateAsync({
        isFetchingSlow: false
      }, this)
    }
  }

  componentDidUpdate (prevProps, prevState) {
    if (JSON.stringify(prevState.videos) !== JSON.stringify(this.state.videos)) {
      const videosDisplayed = this.state.videos.filter(video => {
        return this.state.hideReviewed ? !video.isReviewed : this.state.hideRemoved ? !video.isRemoved : true
      });
      return this.setState({videosDisplayed});
    }
  }

  filterVideos(type) {
    const hides = Object.assign({}, this.baseHide);
    const { videos } = this.state
    hides[type] = !this.state[type];

    const videosDisplayed = videos.filter(video => {
      return hides.hideReviewed ? !video.isReviewed : hides.hideRemoved ? !video.isRemoved : true
    });

    return this.setState({
      videosDisplayed,
      ...hides
    });
  }

  saveToStorage({ type, name, value }) {
    return chrome.storage[type].set({
      [name]: value
    });
  }

  callbackState(name, value, stuff) {
    if (name === 'displaying' || name === 'theme') {
      return this.saveToStorage({ type: 'sync', name, value })
    } else if (name === 'lastSevenDaysflagged') {

      let { templates, searches } = this.state;

      if (stuff) {
        if (stuff.templateId) {
          let index = templates.findIndex(x => x.id == stuff.templateId);
          templates[index].nb_flagged += stuff.nb_flagged
          templates[index].nb_used++
        }
      }

      chrome.storage.sync.set({
        lastSevenDaysflagged: value,
        searches: searches.map(e => ({
          ...e,
          created: copyDate(e.created).toString()
        })),
        templates: templates.map(e => ({
          ...e,
          created: copyDate(e.created).toString()
        }))
      }, () => {
        if (this.state.onToFlag) {
          return this.removeVideosToFlag(true)
        } else {
          return document.getElementById('formFlagging').submit();
        }
      });
    } else if (name === 'videosToFlag') {
      chrome.storage.local.set({
        videosToFlag: this.state.videosToFlag
      })
      chrome.runtime.sendMessage({ type: 'updateBadgeText', videosToFlag: this.state.videosToFlag });
    }
  }

  render() {
    return (
      <YouTubeContext.Provider value={{
        state: this.state,
        getBrowserDatas: () => this.getBrowserDatas(),
        selectVideos: (videos = []) => this.selectItems(videos, 'videosDisplayed'),
        selectSearches: (searches = []) => this.selectItems(searches, 'searches'),
        selectAll: (type, force = true) => this.selectItems(this.state[type], type, force),
        filterVideos: type => this.filterVideos(type),
        addTemplate: (template = [], callback) => this.actionItem(template, 'templates', callback),
        removeTemplate: (template = [], callback) => this.actionItem(template, 'templates', callback),
        openModal: (type, isOpen = true) => this.openModal(type, isOpen),
        removeVideosToFlag: sendForme => this.removeVideosToFlag(sendForme),
        addSearch: (search = [], callback) => this.actionItem(search, 'searches', callback),
        removeSearch: (search = [], callback) => this.actionItem(search, 'searches', callback),
        setState: (name, value, stuffs = null) => this.setState({
          [name]: value
        }, () => this.callbackState(name, value, stuffs)),
        getVideos: (type = 'history', params = getAllUrlParams()) => this.getVideos(type, params)
      }}>{this.props.children}
      </YouTubeContext.Provider>
    )
  }
}

export default YouTubeProvider