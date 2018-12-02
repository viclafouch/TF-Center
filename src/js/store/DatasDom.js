import getVideo from './../getDom/_video'
import getSearch from './../getDom/_search'
import getPagination from './../getDom/_pagination'
import getStatistics from './../getDom/_statistics'
import getUser from './../getDom/_user'
import getVideos from './../getDom/_videos'
import { getUrlParameter } from '../utils/utils';

export default function(pathname) {
  const videoIdWatch = getUrlParameter('v')
  return {
    pathname,
    videos: getVideos(),
    search: getSearch(),
    pagination: getPagination(),
    statistics: pathname === '/stats' ? getStatistics() : null,
    user: getUser(),
    videoIdWatch,
    videoWatched: pathname === '/watch' ? getVideo(videoIdWatch) : null,
  }
}